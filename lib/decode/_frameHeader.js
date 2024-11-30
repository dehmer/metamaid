import Readable from '../readable.js'
import frameBody from './_frameBody.js'

const headerLegacy = read => {
  const headerSize = 6
  const { bytesRead, buffer } = read(headerSize)
  if (bytesRead < headerSize) return

  const header = Readable.of(buffer)
  const id = header.string(3)
  const size = header.uint24()

  return frameBody(id, size)
}

const header = read => {
  const headerSize = 10
  const { bytesRead, buffer } = read(headerSize)
  if (bytesRead < headerSize) return

  const header = Readable.of(buffer)
  const id = header.string(4)
  const size = header.uint32()
  const flags = header.uint16()

  return frameBody(id, size)
}

export default context =>
  context.id === 'ID3v2.2.0'
    ? headerLegacy
    : header
