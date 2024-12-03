#!/usr/bin/env node
import minimist from 'minimist'
import fpcalc from '../lib/chromaprint/fpcalc.js'
import { releaseids } from '../lib/chromaprint/acoustid.js'

const argv = minimist(process.argv.slice(2))
const filename = argv._[0]


;(async () => {
  const fp = await fpcalc(filename)
  const response = await releaseids(fp)
  console.log('response', response)
})()
