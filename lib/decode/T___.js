import Readable from '../readable.js'
import header from './_header.js'

export default (id, size) => (read, context) => {
  const { bytesRead, buffer } = read(size)
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const value = frame.string(encoding)
  context[`${context.id}/${id}`] = value

  return header(context)
}