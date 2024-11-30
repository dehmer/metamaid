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
import Readable from '../lib/readable.js'
import readBuffer from '../lib/readBuffer.js'
import tagHeader from '../lib/decode/_tagHeader.js'

// const ROOT = '/Volumes/audiothek'
const ROOT = "/Users/dehmer/Public/Data/audio/Mediathek/M/Metallica/1983 - Kill 'Em All"
const EXTENSIONS = ['aac', 'aif', 'aiff', 'flac', 'm4a', 'm4v', 'mp3', 'mpc', 'ogg', 'wav', 'wma']
// const PATTERN = `${ROOT}/**/*.{${EXTENSIONS.join(',')}}`
const PATTERN = `${ROOT}/**/*.mp3`
// const PATTERN = `${ROOT}/**/01 - Hit the Lights.mp3`

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

const id3v1 = async (filehandle, size) => {
  const length = 128
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(length), {
    length,
    position: size - length
  })

  if (bytesRead !== length) return {}
  const tag = Readable.of(buffer)

  if ('TAG' === tag.string(3)) return { offset: size - length, length }
  else return { length: 0 }
}

const id3v2 = async (filehandle) => {
  const read = readBuffer(filehandle)
  const { id, size } = await tagHeader(read)
  return { offset: 0, length: size + 10 }
}

const syncsafe = (buffer, offset, length) => {
  return [...Array(length).keys()]
    .map(i => [length - i - 1, offset + i])
    .reduce((acc, [exp, offset]) => acc + buffer.readUInt8(offset) * 128 ** exp, 0)
}

const removemeta = async filename => {

  const buffer = await ((async () => {
    const filehandle = await open(filename, 'r')
    const { size } = await filehandle.stat()
    const { buffer } = await filehandle.read(Buffer.allocUnsafe(size))
    await filehandle.close()
    return buffer
  })())

  ;(async (buffer) => {
    const filehandle = await open(filename, 'w')
    const id3v2 = buffer.toString('latin1', 0, 3)
    const id3v1 = buffer.toString('latin1', buffer.length - 128, buffer.length - 125)

    const offset = id3v2 === 'ID3'
      ? syncsafe(buffer, 6, 4) + 10
      : 0


    const length =
      id3v2 === 'ID3'
        ? id3v1 === 'TAG'
          ? buffer.length - offset - 128
          : buffer.length - offset
        : id3v1 === 'TAG'
          ? buffer.length - 128
          : buffer.length

    console.log('offset', buffer.length, offset, length)


    filehandle.write(buffer, offset, length)
    await filehandle.close()
  })(buffer)

  // const context = {
  //   ...path(filename),
  //   ...await stat(filehandle),
  // }

  // try {
  //   // Read complete file into memory.
  //   const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(context.size))
  //   await filehandle.close()

  //   console.log(context.size, bytesRead)
  //   console.log('id3v1', await id3v1(filehandle, context.size))
  //   console.log('id3v2', await id3v2(filehandle))
  // } catch (err) {
  //   console.error(err)
  // }
  // return context
}

;(async () => {
  const filenames = await glob(PATTERN, { nodir: true })

  await PromisePool
    .withConcurrency(10)
    .for(filenames)
    .process(async filename => {
      console.log('reading', filename)
      await removemeta(filename)
    })
})()
