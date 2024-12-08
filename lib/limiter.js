export default (ms, cb) => {
  let interval
  const q = []

  return async job => {
    q.push(job)
    console.log('queueing', job, q.length)
    if (!interval) interval = setInterval(async () => {
      const job = q.shift()
      console.log('executing queued', job, q.length)
      if (job) await cb(job)
      else {
        clearInterval(interval)
        interval = null
      }
    }, ms)
  }
}
