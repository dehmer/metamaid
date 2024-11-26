#!/usr/bin/env node
import { open } from 'node:fs/promises'
import { dirname, basename, extname } from 'node:path'
import * as R from 'ramda'
import minimist from 'minimist'
import { glob, globSync, globStream, globStreamSync, Glob } from 'glob'
import * as id3v1 from '../lib/id3v1.js'
import * as id3v2 from '../lib/id3v2.js'

const ROOT = '/Volumes/audiothek'
// const ROOT = '/Users/dehmer/Public/Data/audio'
const EXTENSIONS = ['aac', 'aif', 'aiff', 'flac', 'm4a', 'm4v', 'mp3', 'mpc', 'ogg', 'wav', 'wma']
// const PATTERN = `${ROOT}/**/*.{${EXTENSIONS.join(',')}}`
const PATTERN = `${ROOT}/**/*.mp3`

const stat = async filehandle => {
  return filehandle.stat()
  // const stat = await filehandle.stat()
  // return Object.entries(stat).reduce((acc, [key, value]) => {
  //   acc['stat/' + key] = value
  //   return acc
  // }, {})
}

const path = filename => ({
  dirname: dirname(filename),
  extname: extname(filename),
  basename: basename(filename)
})

;(async () => {
  const filenames = await glob(PATTERN, { nodir: true })
  const xs = await filenames.reduce(async (acc, filename) => {
    const xs = await acc
    const filehandle = await open(filename, 'r')
    const info = {
      ...path(filename),
      ...await stat(filehandle),      
    }

    Object.assign(info, await id3v2.read(filehandle, info))
    if (info.version) xs.push(info.version)

    await filehandle.close()
    return xs
  
    // const info = await id3v1.read(filehandle, stat)
    // if (Object.keys(info).length !== 0) console.log(filename, Object.keys(info).length)
    // await filehandle.close()
  }, [])

  console.log(R.uniq(xs))
})()
