#!/usr/bin/env node
import fs from 'node:fs'
import { open } from 'node:fs/promises'
import { dirname, basename, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import * as R from 'ramda'
import minimist from 'minimist'
import { glob, globSync, globStream, globStreamSync, Glob } from 'glob'
import { PromisePool } from '@supercharge/promise-pool'
import * as id3v1 from '../lib/id3v1.js'
import * as id3v2 from '../lib/id3v2.js'

const ROOT = '/Volumes/audiothek'
// const ROOT = '/Users/dehmer/Public/Data/audio'
const EXTENSIONS = ['aac', 'aif', 'aiff', 'flac', 'm4a', 'm4v', 'mp3', 'mpc', 'ogg', 'wav', 'wma']
// const PATTERN = `${ROOT}/**/*.{${EXTENSIONS.join(',')}}`
// const PATTERN = `${ROOT}/**/*.mp3`
const PATTERN = `${ROOT}/**/02_20 - Keine Sterne in Athen.mp3`

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

  await filehandle.close()
  return context
}

;(async () => {
  const filenames = await glob(PATTERN, { nodir: true })
  
  PromisePool
    .withConcurrency(10)
    .for(filenames)
    .process(async filename => {
      // console.log('reading', filename)
      const context = await readmeta(filename)
      console.log(context)
    })
  
    // const info = await id3v1.read(filehandle, stat)
    // if (Object.keys(info).length !== 0) console.log(filename, Object.keys(info).length)
    // await filehandle.close()
})()
