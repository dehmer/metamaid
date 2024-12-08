const client = 'WSFOuNrYhX'

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
  // console.log(JSON.stringify(json, null, 2))
  return json.map(({ id, releases }) => ({
    id,
    releases: releases  ? releases.map(({ id }) => id) : []
  }))
}
