#!/usr/bin/env node
import fs from 'node:fs'
import { open } from 'node:fs/promises'
import { dirname, basename, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import * as R from 'ramda'
import minimist from 'minimist'
import { ClassicLevel } from 'classic-level'
import { glob, globSync, globStream, globStreamSync, Glob } from 'glob'
import { PromisePool } from '@supercharge/promise-pool'
import * as id3v1 from '../lib/id3v1.js'
import * as id3v2 from '../lib/id3v2.js'
import fingerprint from '../lib/chromaprint/fingerprint.js'

// const ROOT = '/Volumes/audiothek'
const ROOT = '/Users/dehmer/Public/Data/audio'
// const ROOT = "/Users/dehmer/Public/Data/audio/Mediathek/M/Metallica/1983 - Kill 'Em All"
const EXTENSIONS = ['aac', 'aif', 'aiff', 'flac', 'm4a', 'm4v', 'mp3', 'mpc', 'ogg', 'wav', 'wma']
// const PATTERN = `${ROOT}/**/*.{${EXTENSIONS.join(',')}}`
const PATTERN = `${ROOT}/**/*.mp3`
// const PATTERN = `${ROOT}/**/06 - Seasons to Cycle.mp3`

const stat = async filehandle => {
  const { atime, mtime, ctime, size } = await filehandle.stat()
  return { atime, mtime, ctime, size }
}

const path = filename => ({
  filename,
  dirname: dirname(filename),
  extname: extname(filename).substring(1),
  basename: basename(filename)
})

const writeImage = context => {
  // Write first image to file
  const apic = context[`${context.id}/APIC`] || context[`${context.id}/PIC`]
  if (apic) {
    const image = apic[0]
    console.log('image data', !!image)
    const ext = image.mimetype
      ? image.mimetype.substring(image.mimetype.indexOf('/') + 1)
      : image.format.toLowerCase()
    fs.writeFileSync(`/Users/dehmer/Downloads/tmp/${randomUUID()}.${ext}`, image.data)
  } else console.log('image data', false)
}

const readmeta = async filename => {
  const filehandle = await open(filename, 'r')
  const context = {
    uuid: randomUUID(),
    ...path(filename),
    ...await stat(filehandle),
  }

  Object.assign(context, {
    ...await id3v1.read(filehandle, context),
    ...await id3v2.read(filehandle, context)
  })

  const id = context['ID3v2.3.0'] ? 'ID3v2.3.0' : context['ID3v2.4.0'] ? 'ID3v2.4.0' : undefined
  const fingerprintKey = id ? `${id}/TXXX/Acoustid Fingerprint` : undefined
  if (fingerprintKey) {
    context[fingerprintKey] = await fingerprint(filename)
  }

  await filehandle.close()

  return context
}

const putContext = location => {
  const db = new ClassicLevel(location)
  const textDB = db.sublevel('text', { valueEncoding: 'json' })
  const binaryDB = db.sublevel('binary', { valueEncoding: 'buffer' })

  const put = async context => {
    const { uuid, ...rest } = context
    const { text, binary } = Object.entries(rest).reduce((acc, [key, value]) => {
      if (typeof value === 'string') {
        acc.text.push(({ type: 'put', key: `${uuid}/${key}`, value }))
      } else if (value instanceof Buffer) {
        acc.binary.push(({ type: 'put', key: `${uuid}/${key}`, value }))
      }
      return acc
    }, { text: [], binary: [] })

    await textDB.batch(text)
    await binaryDB.batch(binary)
  }

  put.dispose = () => db.close()

  return put
}

;(async () => {
  const filenames = await glob(PATTERN, { nodir: true })
  const put = putContext('./db')

  await PromisePool
    .withConcurrency(10)
    .for(filenames)
    .process(async filename => {
      // console.log('reading', filename)
      const context = await readmeta(filename)
      const { uuid, ...rest } = context
      console.log(context)
      await put(context)
    })

  await put.dispose()
})()
