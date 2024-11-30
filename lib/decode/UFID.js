import Readable from '../readable.js'
import header from './_header.js'

export default (id, size) => (read, context) => {
  const { bytesRead, buffer } = read(size)
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const owner = frame.string()
  const identifier = frame.string()
  context[`${context.id}/${id}/OWNER`] = owner
  context[`${context.id}/${id}/ID`] = identifier

  return header(context)
}
