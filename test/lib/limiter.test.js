import assert from 'node:assert'
import { test } from 'vitest'
import * as R from 'ramda'
import limiter from '../../lib/limiter.js'

test('limiter', async () => {
  const callback = R.identity
  const q = limiter(10, callback)
  const ps = R.range(0, 5).map(i => q(i))
  const actual = await Promise.all(ps)
  assert.deepStrictEqual(actual, [0, 1, 2, 3, 4])
})
