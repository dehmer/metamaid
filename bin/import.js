#!/usr/bin/env node
import fs from 'node:fs'
import { open } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import * as R from 'ramda'
import minimist from 'minimist'
import { ClassicLevel } from 'classic-level'
import { glob, globSync, globStream, globStreamSync, Glob } from 'glob'
import { PromisePool } from '@supercharge/promise-pool'
import * as id3v1 from '../lib/id3v1.js'
import * as id3v2 from '../lib/id3v2.js'
import fpcalc from '../lib/chromaprint/fpcalc.js'
import { translate } from '../lib/mappings.js'

// const ROOT = '/Volumes/audiothek'
const ROOT = '/Users/dehmer/Public/Audio/Mediathek'
// const ROOT = '/Users/dehmer/Public/Audio/M/Metallica/1999 - S&M/Disc 1'
// const ROOT = "/Users/dehmer/Public/Data/audio/Mediathek/M/Metallica/1983 - Kill 'Em All"
const EXTENSIONS = ['aac', 'aif', 'aiff', 'flac', 'm4a', 'm4v', 'mp3', 'mpc', 'ogg', 'wav', 'wma']
// const PATTERN = `${ROOT}/**/*.{${EXTENSIONS.join(',')}}`
const PATTERN = `${ROOT}/**/*.mp3`
// const PATTERN = `${ROOT}/**/1983 - Kill 'Em All/*.mp3`
// const PATTERN = `${ROOT}/**/07 - Phantom Lord.mp3`

const stat = async filehandle => {
  const { atime, mtime, ctime, birthtime, size } = await filehandle.stat()
  return { atime, mtime, ctime, birthtime, size }
}

// const path = filename => ({
//   filename,
//   dirname: dirname(filename),
//   extname: extname(filename).substring(1),
//   basename: basename(filename)
// })

const writeImage = context => {
  // Write first image to file
  const apic = context[`${context.id}/APIC`] || context[`${context.id}/PIC`]
  if (apic) {
    const image = apic[0]
    const ext = image.mimetype
      ? image.mimetype.substring(image.mimetype.indexOf('/') + 1)
      : image.format.toLowerCase()
    fs.writeFileSync(`/Users/dehmer/Downloads/tmp/${randomUUID()}.${ext}`, image.data)
  } else console.log('image data', false)
}

const calcFingerprint = async (filename, context, force) => {
  const key = 'TXXX/Acoustid Fingerprint'

  if (force || !context[key]) {
    const fp = key ? await fpcalc(filename) : undefined
    if (fp) return {
      [key]: fp.fingerprint ,
      'TXXX/Acoustid Duration': fp.duration
    }
    else {
      console.warn('empty fingerprint')
      return {}
    }
  }
}

const readmeta = async (directories, filename) => {
  console.log('[readmeta]', filename)
  const filehandle = await open(filename, 'r')
  const context = {
    uuid: randomUUID(),
    filename,
    ...await stat(filehandle),
  }

  if (!directories[dirname(filename)]) directories[dirname(filename)] = randomUUID()
  context.directory = directories[dirname(filename)]

  try {
    Object.assign(context, {
      // ...await id3v1.read(filehandle, context),
      ...await id3v2.read(filehandle, context)
    })

    Object.assign(context, await calcFingerprint(filename, context, true))
  } catch (err) {
    console.error(err)
  } finally {
    await filehandle.close()
  }

  return translate(context)
}

const storemeta = location => {
  const db = new ClassicLevel(location)
  const textDB = db.sublevel('text', { valueEncoding: 'json' })
  const binaryDB = db.sublevel('binary', { valueEncoding: 'buffer' })

  const put = async context => {
    const fileid = context['file:id/file']
    const filename = context['file:name']
    const dirid = context['file:id/dir']

    const { text, binary } = Object.entries(context).reduce((acc, [key, value]) => {
      if (typeof value === 'string') {
        acc.text.push(({ type: 'put', key: `${fileid}/${key}`, value }))
      } else if (value instanceof Buffer) {
        acc.binary.push(({ type: 'put', key: `${fileid}/${key}`, value }))
      }
      return acc
    }, { text: [], binary: [] })

    text.push({ type: 'put', key: `directory:${dirname(filename)}`, value: dirid })
    text.push({ type: 'put', key: `file:${filename}`, value: fileid })
    text.push({ type: 'put', key: `directory+file:${dirid}/${fileid}`, value: filename })
    await textDB.batch(text)
    await binaryDB.batch(binary)
  }

  put.dispose = () => db.close()

  return put
}

;(async () => {
  const directories = {}
  const filenames = await glob(PATTERN, { nodir: true })
  const store = storemeta('./db')

  await PromisePool
    .withConcurrency(10)
    .for(filenames)
    .process(async filename => {
      try {
        const context = await readmeta(directories, filename)
        await store(context)
      } catch (err) {
        console.error(err)
      }
    })

  await store.dispose()
})()
