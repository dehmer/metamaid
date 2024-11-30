#!/usr/bin/env node
import { spawn } from 'node:child_process'

const filename = "/Users/dehmer/Public/Data/audio/Mediathek/M/Metallica/1983 - Kill 'Em All/01 - Hit the Lights.mp3"

const run = filename => {
  const stderr = []
  const stdout = []
  const args = [filename]
  const child = spawn('fpcalc', args)
  child.stderr.on('data', data => stderr.push(data))
  child.stdout.on('data', data => stdout.push(data))

  return new Promise((resolve, reject) => {
    child.on('close', code => {
      if (code) reject(code)
      const result = stdout.join().split(/\r\n|\r|\n/).reduce((acc, line) => {
        if (!line.trim()) return acc
        const [key, value] = line.split('=')
        acc[key.toLowerCase()] = value
        return acc
      }, {})

      resolve(result.fingerprint)
    })
  })
}

;(async () => {
  try {
    const result = await run(filename)
    console.log(result)
  } catch (err) {
    console.error(err)
  }
})()
