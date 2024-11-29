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

const ignoredFrame = (id, size) => (read, context) => {
  const { bytesRead } = read(size) // read (and ignore) frame to continue reading
  if (bytesRead < size) return
  else decodeFrameHeader
}

const unsupportedFrame = (id, size) => (read, context) => {
  console.warn('unsupported frame', id)
  const { bytesRead } = read(size) // read (and ignore) frame to continue reading
  if (bytesRead < size) return
  else decodeFrameHeader
}

const decodeT___Frame = (id, size) => (read, context) => {
  const { bytesRead, buffer } = read(size)
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const value = frame.string(encoding)
  context[`${context.id}/${id}`] = value

  return decodeFrameHeader
}

const decodeT__Frame = (id, size) => (read, context) => {
  const { bytesRead, buffer } = read(size)
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const value = frame.string(encoding)
  context[`${context.id}/${id}`] = value

  return decodeFrameHeaderLegacy
}

const decodeAPICFrame = (id, size) => (read, context) => {
  const { bytesRead, buffer } = read(size)
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

const decodeCOMFrame = (id, size) => (read, context) => {
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

  return decodeFrameHeaderLegacy
}

const decodePICFrame = (id, size) => (read, context) => {
  const { bytesRead, buffer } = read(size)
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

const decodeCOMMFrame = (id, size) => (read, context) => {
  const { bytesRead, buffer } = read(size)
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

const decodeMCDIFrame = (id, size) => (read, context) => {
  const { bytesRead, buffer } = read(size)
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const data = frame.subarray()
  context[`${context.id}/${id}`, data]

  return decodeFrameHeader
}

const decodeUFIDFrame = (id, size) => (read, context) => {
  const { bytesRead, buffer } = read(size)
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const owner = frame.string()
  const identifier = frame.string()
  context[`${context.id}/${id}/OWNER`] = owner
  context[`${context.id}/${id}/ID`] = identifier

  return decodeFrameHeader
}

const decodeUSLTFrame = (id, size) => (read, context) => {
  const { bytesRead, buffer } = read(size)
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const language = frame.string(3)
  const descriptor = frame.string(encoding)
  const text = frame.string(encoding)
  context[`${context.id}/${id}/${language}`] = text

  return decodeFrameHeader
}

const decodeTXXXFrame = (id, size) => (read, context) => {
  const { bytesRead, buffer } = read(size)
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
  [/^COM$/,  decodeCOMFrame],
  [/^PCS$/,  ignoredFrame],
  [/^PIC$/,  decodePICFrame],
  [/^RVA$/,  ignoredFrame], // Relative volume adjustment
  [/^T..$/,  decodeT__Frame],
  [/^UFI$/,  ignoredFrame],
  [/^ULT$/,  ignoredFrame],
  [/^APIC$/, decodeAPICFrame],
  [/^COMM$/, decodeCOMMFrame],
  [/^GEOB$/, ignoredFrame],
  [/^MCDI$/, decodeMCDIFrame],
  [/^NCON$/, ignoredFrame],
  [/^PCNT$/, ignoredFrame],
  [/^PCST$/, ignoredFrame],
  [/^POPM$/, ignoredFrame],
  [/^PRIV$/, ignoredFrame],
  [/^RGAD$/, ignoredFrame],
  [/^RVAD$/, ignoredFrame], // Relative volume adjustment
  [/^RVA2$/, ignoredFrame], // Relative volume adjustment (2)
  [/^TXXX$/, decodeTXXXFrame],
  [/^UFID$/, decodeUFIDFrame],
  [/^USER$/, ignoredFrame],
  [/^USLT$/, decodeUSLTFrame],
  [/^XSOP$/, ignoredFrame],
  [/^W...$/, ignoredFrame],
  [/^T...$/, decodeT___Frame],
  [/^\w{3,4}$/, unsupportedFrame]
]

const frameDecoder = (id, size) => {
  if (!id.trim()) return

  const decoder = FRAME_DECODERS.find(([regex]) => regex.test(id))
  // if (!decoder) console.warn('unsupported frame', `"${id}" (${id.length})`)
  return decoder && decoder[1](id, size)
}

const decodeFrameHeader = (read, context) => {
  const headerSize = 10
  const { bytesRead, buffer } = read(headerSize)
  if (bytesRead < headerSize) return

  const header = Readable.of(buffer)
  const id = header.string(4)
  const size = header.uint32()
  const flags = header.uint16()

  return frameDecoder(id, size)
}

const decodeFrameHeaderLegacy = (read, context) => {
  const headerSize = 6
  const { bytesRead, buffer } = read(headerSize)
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
  const decoder = id === 'ID3v2.2.0'
    ? decodeFrameHeaderLegacy
    : decodeFrameHeader

    const context = { id, [id]: true }
    decode(decoder, slice, context)

  delete context.id
  return context
}
