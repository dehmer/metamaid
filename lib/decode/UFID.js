import Readable from '../readable.js'
import header from './_frameHeader.js'

export default (id, size) => (read, context) => {
  const { bytesRead, buffer } = read(size)
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const owner = frame.string()
  const identifier = frame.string()
  context[`${id}/OWNER`] = owner
  context[`${id}/ID`] = identifier

  return header(context)
}
