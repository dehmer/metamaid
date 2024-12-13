export default (ms, cb) => {
  let busy = false
  const q = []

  const execute = async ([job, resolve, reject]) => {
    try {
      const result = await cb(job)
      resolve(result)
    } catch (err) {
      console.error(err)
      reject(err)
    }
  }

  const sleep = () => new Promise(resolve => setTimeout(resolve, ms))

  const run = async () => {
    if (busy) return
    busy = true

    while (q.length > 0) {
      await execute(q.shift())
      await sleep()
    }

    busy = false
  }

  return async job => new Promise((resolve, reject) => {
    q.push([job, resolve, reject])
    run()
  })
}
