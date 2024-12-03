import { spawn } from 'node:child_process'

export default filename => new Promise((resolve) => {
  const stderr = []
  const stdout = []
  const child = spawn('fpcalc', [filename])
  child.stderr.on('data', data => stderr.push(data))
  child.stdout.on('data', data => stdout.push(data))

  child.on('close', code => {
    if (code) resolve()
    const result = stdout.join().split(/\r\n|\r|\n/).reduce((acc, line) => {
      if (!line.trim()) return acc
      const [key, value] = line.split('=')
      acc[key.toLowerCase()] = value
      return acc
    }, {})

    resolve(result)
  })
})
