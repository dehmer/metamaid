import Readable from '../readable.js'
import header from './_header.js'

export default (id, size) => (read, context) => {
  const { bytesRead, buffer } = read(size)
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const language = frame.string(3).trim()
  const description = frame.string(encoding).trim()
  const content = frame.string(encoding)

  const fields = [context.id, id]
  if (language.length === 3) fields.push(language)
  if (description) fields.push(description)
  const key = fields.join('/')
  context[key] = content

  return header(context)
}
