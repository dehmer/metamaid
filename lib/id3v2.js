import Readable from './readable.js'

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

const ignoredFrame = (id, size) => async (read, context) => {
  const { bytesRead } = await read(size) // read (and ignore) frame to continue reading
  if (bytesRead < size) return
  else decodeFrameHeader
}

const unsupportedFrame = (id, size) => async (read, context) => {
  console.warn('unsupported frame', id)
  const { bytesRead } = await read(size) // read (and ignore) frame to continue reading
  if (bytesRead < size) return
  else decodeFrameHeader
}

const decodeTextFrame = (id, size) => async (read, context) => {
  const { bytesRead, buffer } = await read(size)
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const value = frame.string(encoding)
  context[`${context.id}/${id}`] = value

  return decodeFrameHeader
}

const decodeTextFrameLegacy = (id, size) => async (read, context) => {
  const { bytesRead, buffer } = await read(size)
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const value = frame.string(encoding)
  context[`${context.id}/${id}`] = value

  return decodeFrameHeaderLegacy
}

const decodeAPICFrame = (id, size) => async (read, context) => {
  const { bytesRead, buffer } = await read(size)
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const mimetype = frame.string()
  const type = frame.uint8()
  const description = frame.string(encoding)
  const data = frame.subarray()
  context[`${context.id}/${id}/${type}`] = data

  return decodeFrameHeader
}

const decodePICFrameLegacy = (id, size) => async (read, context) => {
  const { bytesRead, buffer } = await read(size)
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const format = frame.string(3)
  const type = frame.uint8()
  const description = frame.string(encoding)
  const data = frame.subarray()
  context[`${context.id}/${id}/${type}`] = data

  return decodeFrameHeaderLegacy
}

const decodeCOMMFrame = (id, size) => async (read, context) => {
  const { bytesRead, buffer } = await read(size)
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const language = frame.string(3)
  const description = frame.string(encoding)
  const text = frame.string(encoding)
  const key = description ? `${context.id}/${id}/${description}` : `${context.id}/${id}`
  context[key] = text

  return decodeFrameHeader
}

const decodeUFIDFrame = (id, size) => async (read, context) => {
  const { bytesRead, buffer } = await read(size)
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const owner = frame.string()
  const identifier = frame.string()
  context[`${context.id}/${id}/OWNER`] = owner
  context[`${context.id}/${id}/ID`] = identifier

  return decodeFrameHeader
}

const decodeUSLTFrame = (id, size) => async (read, context) => {
  const { bytesRead, buffer } = await read(size)
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const language = frame.string(3)
  const descriptor = frame.string(encoding)
  const text = frame.string(encoding)
  context[`${context.id}/${id}/${language}`] = text

  return decodeFrameHeader
}

const decodeTXXXFrame = (id, size) => async (read, context) => {
  const { bytesRead, buffer } = await read(size)
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const description = frame.string(encoding)
  const value = frame.string(encoding)
  const key = description ? `${context.id}/${id}/${description}` : '${context.id}/${id}'
  context[key] = value

  return decodeFrameHeader
}

const FRAME_DECODERS = [
  [/^PIC$/,  decodePICFrameLegacy],
  [/^T..$/,  decodeTextFrameLegacy],
  [/^APIC$/, decodeAPICFrame],
  [/^COMM$/, decodeCOMMFrame],
  [/^PRIV$/, ignoredFrame],
  [/^TXXX$/, decodeTXXXFrame],
  [/^UFID$/, decodeUFIDFrame],
  [/^USLT$/, decodeUSLTFrame],
  [/^T...$/, decodeTextFrame],
  [/^\w{3,4}$/, unsupportedFrame]
]

const frameDecoder = (id, size) => {
  if (!id.trim()) return

  const decoder = FRAME_DECODERS.find(([regex]) => regex.test(id))
  // if (!decoder) console.warn('unsupported frame', `"${id}" (${id.length})`)
  return decoder && decoder[1](id, size)
}

const decodeFrameHeader = async (read, context) => {
  const headerSize = 10
  const { bytesRead, buffer } = await read(headerSize)
  if (bytesRead < headerSize) return

  const header = Readable.of(buffer)
  const id = header.string(4)
  const size = header.uint32()
  const flags = header.uint16()

  return frameDecoder(id, size)
}

const decodeFrameHeaderLegacy = async (read, context) => {
  const headerSize = 6
  const { bytesRead, buffer } = await read(headerSize)
  if (bytesRead < headerSize) return

  const header = Readable.of(buffer)
  const id = header.string(3)
  const size = header.uint24()

  return frameDecoder(id, size)
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

const decode = async (decoder, read, context) => {
  const succ = await decoder(read, context)
  if (succ) await decode(succ, read, context)
}

export const read = async (filehandle, info) => {
  const read = readBuffer(filehandle)
  const { id, size } = await decodeTagHeader(read)
  if (size === 0) return {}

  const { bytesRead, buffer } = await read(size)
  if (bytesRead !== size) return {}

  const slice = sliceBuffer(buffer)
  const decoder = id === 'ID3v2.2.0'
    ? decodeFrameHeaderLegacy
    : decodeFrameHeader

    const context = { id }
    await decode(decoder, slice, context)

  delete context.id
  return context
}
