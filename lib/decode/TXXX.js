import Readable from '../readable.js'
import header from './_frameHeader.js'

export default (id, size) => (read, context) => {
  const { bytesRead, buffer } = read(size)
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const description = frame.string(encoding)
  const value = frame.string(encoding)
  const key = description ? `${id}/${description}` : id
  context[key] = value

  return header(context)
}
