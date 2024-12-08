#!/usr/bin/env node
import { ClassicLevel } from 'classic-level'
import * as R from 'ramda'
import { releaseids } from '../lib/chromaprint/acoustid.js'
import limiter from '../lib/limiter.js'

const db = new ClassicLevel('./db')
const text = db.sublevel('text', { valueEncoding: 'json' })

const gather = async () => {
  const requests = limiter(500, async ([key, value]) => {
    const dirid = value['file:id/dir']
    const fileid = value['file:id/file']

    const releases = await releaseids({
      fingerprint: value['acoustid.org:fingerprint'],
      duration: value['acoustid.org:duration']
    })

    try {
      const ops = releases.map(({ id: trackid, releases }) => ({
        type: 'put',
        key: `releases:${dirid}/${fileid}/${trackid}`,
        value: releases
      }))

      await text.batch(ops)
    } catch (err) {
      console.error(err)
    }
  })

  const options = {
    gte: 'file+tag:',
    lt: 'file+tag:\xff'
  }

  for await (const [key, value] of text.iterator(options)) {
    console.log(key, value)
    requests([key, value])
  }
}

/**
 * Each directory [dirid] contains multiple files [fileid], each with its own fingerprint.
 * AcoustId fingerprint lookup might yield multiple tracks [trackid] for each file.
 * Each track may be part of multiple MusicBrainz releases (releaseid):
 *
 *   1 dir -> x files -> y tracks -> z releases
 */
const reduce = async () => {
  const options = {
    gte: 'releases:',
    lt: 'releases:\xff'
  }

  const matches = {}

  for await (const [key, releases] of text.iterator(options)) {
    const { dirid, fileid, trackid } = /releases\:(?<dirid>[0-9a-f-]*)\/(?<fileid>[0-9a-f-]*)\/(?<trackid>[0-9a-f-]*)/.exec(key).groups
    console.log(key, releases, dirid, fileid, trackid)
    matches[dirid] = matches[dirid] || {}

    // Match release set with all file/track release set combinations.
    const files = Object.entries(matches[dirid])
    if (!files.length) {
      // No files yet: add first release set of first track
      matches[dirid][fileid] = { [trackid]: releases }
    } else {

    }
  }

  console.log(matches)
}

;(async () => {
  // await gather()
  await reduce()
})()
