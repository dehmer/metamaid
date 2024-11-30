#!/usr/bin/env node
import { ClassicLevel } from 'classic-level'

;(async () => {
  const db = new ClassicLevel('./db')
  const text = db.sublevel('text', { valueEncoding: 'json' })
  const binary = db.sublevel('binary', { valueEncoding: 'buffer' })

  for await (const [key, value] of text.iterator()) console.log(key, value)
  for await (const [key, value] of binary.iterator()) console.log(key, value)
})()
