const client = 'WSFOuNrYhX'

const q = []

const enqueue = url => {
  q.push(url)
}

const results = async (fp, meta) => {
  const args = Object.entries({
    client,
    meta: meta.join('+'),
    ...fp
  })
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  // TODO: POST with compressed body
  const url = `https://api.acoustid.org/v2/lookup?${args}`
  const response = await fetch(url)
  const json = await response.json()
  if (json.status === 'ok') return json.results
}

export const releaseids = async fp => {
  const meta = ['releaseids']
  const json = await results(fp, meta)
  return json.map(entry => ({
    ...entry,
    releases: entry.releases.map(({ id }) => id)
  }))
}
