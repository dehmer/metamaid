import Readable from '../readable.js'
import header from './_frameHeader.js'

export default (id, size) => (read, context) => {
  const { bytesRead, buffer } = read(size)
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const language = frame.string(3)
  const description = frame.string(encoding)
  const text = frame.string(encoding)
  const key = description ? `${context.id}/${id}/${description}` : `${context.id}/${id}`
  context[key] = text

  return header(context)
}
