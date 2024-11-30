import Readable from '../readable.js'
import header from './_header.js'

export default (id, size) => (read, context) => {
  const { bytesRead, buffer } = read(size)
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const format = frame.string(3)
  const type = frame.uint8()
  const description = frame.string(encoding)
  const data = frame.subarray()
  context[`${context.id}/${id}/${type}`] = data

  return header(context)
}
