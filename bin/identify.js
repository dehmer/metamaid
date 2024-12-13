#!/usr/bin/env node
import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import * as R from 'ramda'
import * as store from '../lib/store.js'
import fpcalc from '../lib/chromaprint/fpcalc.js'
import { fetchreleases } from '../lib/chromaprint/acoustid.js'

const tracks = () => new Transform({
  objectMode: true,
  async transform({ key, value }, _, callback) {
    const { dirname } = /^directory:(?<dirname>.*)$/.exec(key).groups
    const dirid = value
    const tracks = await store.tracks(dirid)
    // Note: `trackid` includes `dirid`.
    const trackid = s => /^directory\+file:(?<trackid>.*)$/.exec(s).groups.trackid
    const maptracks = ([key, filename]) => ({ trackid: trackid(key), filename })
    callback(null, { dirid, dirname, tracks: tracks.map(maptracks) })
  }
})

const fingerprint = (force = false) => new Transform({
  objectMode: true,
  async transform({ dirid, dirname, tracks }, _, callback) {
    const fp = await tracks.reduce(async (acc, { trackid, filename }) => {
      const list = await acc

      // Pull fingerprint from tag or calculate it afresh.
      const fp = await (async () => {
        const tag = force ? undefined : await store.tag(trackid)
        const fp = tag['acoustid.org:duration'] && tag['acoustid.org:fingerprint']
          ? { duration: tag['acoustid.org:duration'], fingerprint: tag['acoustid.org:fingerprint'] }
          : {}

        if (R.isEmpty(fp)) {
          const calculated = await fpcalc(filename)
          await store.updateTag(trackid, tag => ({
            ...tag,
            'acoustid.org:duration': calculated.duration,
            'acoustid.org:fingerprint': calculated.fingerprint
          }))

          return calculated
        } else {
          return fp
        }
      })()

      list.push({ trackid, filename, ...fp })
      return list
    }, [])

    callback(null, { dirid, dirname, tracks: fp })
  }
})

const releases = () => new Transform({
  objectMode: true,
  async transform({ dirid, dirname, tracks }, _, callback) {
    const trackCount = tracks.length
    const releases = await tracks.reduce(async (acc, track) => {
      const { trackid, filename, duration, fingerprint } = track
      const tracks = await acc

      const releases = await (async () => {
        const available = await store.releases(trackid)
        if (available) return available
        const releases = await fetchreleases({ duration, fingerprint }, trackCount)
        await store.putReleases(trackid, releases)
        return releases
      })()

      const highscore = releases[0]
      if (!highscore) tracks.push({ trackid, filename, duration })
      else {
        // console.log('highscore', highscore)
        const titles = R.groupBy(R.prop('title'), highscore.releases)
        const [_, title] = Object.entries(titles).reduce((acc, [title, entries]) => {
          // console.log(title, entries)
          if (entries.length > acc[0]) {
            acc[0] = entries.length
            acc[1] = title
          }
          return acc
        }, [0])

        const filtered = highscore.releases.filter(release => {
          return (release.title = title) && (release.country = 'US') && release.date
        })

        tracks.push({ trackid, filename, duration, releases: filtered })
      }
      return tracks
    }, [])

    callback(null, {
      dirid,
      dirname,
      tracks: releases
    })
  }
})

const match = () => new Transform({
  objectMode: true,
  transform(chunk, _, callback) {
    console.log(`[${chunk.dirname}]`)
    chunk.tracks.forEach(track => console.log(track.releases?.length))
    callback()
  }
})

await pipeline([
  store.directoryStream(),
  tracks(),
  fingerprint(false),
  releases(),
  match()
])
