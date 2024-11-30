import Readable from '../readable.js'
import header from './_header.js'

export default (id, size) => (read, context) => {
  const { bytesRead, buffer } = read(size)
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const description = frame.string(encoding)
  const value = frame.string(encoding)
  const key = description ? `${context.id}/${id}/${description}` : '${context.id}/${id}'
  context[key] = value

  return header(context)
}
