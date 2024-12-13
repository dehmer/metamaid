import { ClassicLevel } from 'classic-level'
import { EntryStream } from 'level-read-stream'
import * as R from 'ramda'

const db = new ClassicLevel('./db')
export const text = db.sublevel('text', { valueEncoding: 'json' })
export const binary = db.sublevel('binary', { valueEncoding: 'buffer' })

export const range = prefix =>
  prefix
    ? ({ gt: prefix, lt: `${prefix}\xff` })
    : {}

export const value = R.curry((db, key) => db.get(key))

export const update = async (db, key, f, defaultValue) => {
  const value = (await db.get(key)) || defaultValue
  await db.put(key, f(value))
}

export const put = (db, key, value) => db.put(key, value)

export const iterator = R.curry((options, db) => db.iterator(options))
export const entryStream = R.curry((options, db) => new EntryStream(db, options))
export const entries = R.curry((options, db) => Array.fromAsync(iterator(options, db)))
export const fromAsync = it => Array.fromAsync(it)
export const directories = () => fromAsync(iterator(range('directory:'), text))
export const directoryStream = () => entryStream(range('directory:'), text)
export const files = partition => entries(range(`file+tag:${partition}`), text)
export const tracks = partition => entries(range(`directory+file:${partition}`), text)
export const tag = id => value(text, `file+tag:${id}`)
export const updateTag = (id, f) => update(text, `file+tag:${id}`, f, {})
export const releases = id => value(text, `releases:${id}`)
export const putReleases = (id, releases) => put(text, `releases:${id}`, releases)
