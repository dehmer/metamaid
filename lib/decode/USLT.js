import Readable from '../readable.js'
import header from './_frameHeader.js'

export default (id, size) => (read, context) => {
  const { bytesRead, buffer } = read(size)
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const language = frame.string(3)
  const descriptor = frame.string(encoding)
  const text = frame.string(encoding)
  context[`${context.id}/${id}/${language}`] = text

  return header(context)
}
