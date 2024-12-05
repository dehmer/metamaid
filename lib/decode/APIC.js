import Readable from '../readable.js'
import header from './_frameHeader.js'

export default (id, size) => (read, context) => {
  const { bytesRead, buffer } = read(size)
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const mimetype = frame.string()
  const type = frame.uint8()
  const description = frame.string(encoding)
  const data = frame.subarray()
  context[`${id}/${type}`] = data

  return header(context)
}
