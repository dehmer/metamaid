import Readable from './readable.js'
import header from './decode/_header.js'

const readBuffer = filehandle => size =>
  filehandle.read(Buffer.allocUnsafe(size))

const sliceBuffer = buffer => {
  let offset = 0

  return size => {
    if (offset + size >= buffer.length) return { bytesRead: 0 }
    const subarray = buffer.subarray(offset, offset + size)
    offset += size
    return { bytesRead: size, buffer: subarray }
  }
}

const decodeTagHeader = async read => {
  const headerSize = 10
  const { bytesRead, buffer } = await read(headerSize)
  if (bytesRead < headerSize) return { size: 0 }

  const header = Readable.of(buffer)
  const id = header.string(3)
  const major = header.uint8()

  // Bail-out on unsupported major version:
  if (major > 4) return { size: 0 }

  const revision = header.uint8()
  const flags = header.uint8()

  // No flags are supported just yet:
  if (flags !== 0) return { size: 0 }

  return {
    size: header.syncsafe(4),
    id: `${id}v2.${major}.${revision}`
  }
}

const decode = (decoder, read, context) => {
  const succ = decoder(read, context)
  if (succ) decode(succ, read, context)
}

export const read = async (filehandle, info) => {
  const read = readBuffer(filehandle)
  const { id, size } = await decodeTagHeader(read)
  if (size === 0) return {}

  const { bytesRead, buffer } = await read(size)
  if (bytesRead !== size) return {}

  const slice = sliceBuffer(buffer)
  const context = { id, [id]: true }
  decode(header(context), slice, context)

  delete context.id
  return context
}
