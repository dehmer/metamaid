#!/usr/bin/env node
import { dirname } from 'node:path'
import fs from 'node:fs/promises'
import { ClassicLevel } from 'classic-level'
import sharp from 'sharp'


;(async () => {
  const db = new ClassicLevel('./db')
  const text = db.sublevel('text', { valueEncoding: 'json' })
  const binary = db.sublevel('binary', { valueEncoding: 'buffer' })

  const options = {
    gte: 'frame:picture/cover/',
    lt: 'frame:picture/cover/\xff'
  }
  // for await (const [key, value] of text.iterator()) console.log(key, value)
  for await (const [key, value] of binary.iterator(options)) {
    const fileid = key.substring('frame:picture/cover/'.length)
    const tag = await text.get(`file+tag:${fileid}`)
    const dir = dirname(tag['file:name'])
    const { format, width, height, space } = await sharp(value).metadata()
    console.log(`${format}@${space}`, `${width} x ${height}`, dir)
    const filename = `${dir}/cover.${format}`

    try {
      await fs.stat(filename)
    } catch (err) {
      await fs.writeFile(filename, value)
    }
  }
})()
