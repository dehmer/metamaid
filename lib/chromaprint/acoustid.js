import limiter from '../limiter.js'

const client = 'WSFOuNrYhX'

const callback = async options => {
  const { meta, ...rest } = options
  const args = Object.entries({
    client,
    meta: (meta ?? []).join('+'),
    ...rest
  })
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  // TODO: POST with compressed body
  const url = `https://api.acoustid.org/v2/lookup?${args}`
  const response = await fetch(url)
  if (response.status !== 200) {
    const message = `fetch api.acoustid.org status${response.status} (${response.statusText})`
    throw new Error(message)
  }

  const { status, results } = await response.json()
  if (status !== 'ok') {
    const message = 'fetch api.acoustid.org status was not "ok"'
    throw new Error(message)
  }

  return results
}

const queue = limiter(400, callback)

export const lookup = options => queue(options)

export const fetchreleases = async (options, trackCount) => {

  const filter = (trackCount, results) => results.reduce((acc, { releases, ...rest }) => {
    if (!releases) return acc

    const filtered = releases
      .filter(release => release.track_count === trackCount)
      .map(({ releaseevents, ...rest }) => rest)

    if (filtered.length) acc.push({ ...rest, releases: filtered })
    return acc
  }, [])

  const results = await lookup({ ...options, meta: ['releases'] })
  return trackCount
    ? filter(trackCount, results)
    : results
}
