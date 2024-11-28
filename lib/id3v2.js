import Readable from './readable.js'

const decodeTextFrame = (id, size) => async (filehandle, context) => {
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(size))
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const value = frame.string(encoding)
  context[`${context.id}/${id}`] = value

  return decodeFrameHeader
}

const decodeTextFrameLegacy = (id, size) => async (filehandle, context) => {
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(size))
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const value = frame.string(encoding)
  context[`${context.id}/${id}`] = value

  return decodeFrameHeaderLegacy
}

const decodeAPICFrame = (id, size) => async (filehandle, context) => {
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(size))
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

const decodePICFrameLegacy = (id, size) => async (filehandle, context) => {
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(size))
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

const decodeCOMMFrame = (id, size) => async (filehandle, context) => {
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(size))
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const language = frame.string(3)
  const description = frame.string(encoding)
  const text = frame.string(encoding)

  context[`${context.id}/${id}`] ??= []
  context[`${context.id}/${id}`].push({
    language,
    description,
    text 
  })

  return decodeFrameHeader
}

const decodeUFIDFrame = (id, size) => async (filehandle, context) => {
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(size))
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const owner = frame.string()
  const identifier = frame.string()
  context[`${context.id}/${id}/OWNER`] = owner
  context[`${context.id}/${id}/ID`] = identifier

  return decodeFrameHeader
}

const decodeUSLTFrame = (id, size) => async (filehandle, context) => {
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(size))
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const language = frame.string(3)
  const descriptor = frame.string(encoding)
  const text = frame.string(encoding)
  context[`${context.id}/${id}/${language}`] = text

  return decodeFrameHeader
}

const decodePRIVFrame = (id, size) => async (filehandle, context) => {
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(size))
  if (bytesRead < size) return

  // Just skip it form now.
  // const frame = Readable.of(buffer)
  // const owner = frame.string()
  // const data = frame.subarray()
  // context.PRIV ??= {}
  // context.PRIV[owner] = data

  return decodeFrameHeader
}

const decodeTXXXFrame = (id, size) => async (filehandle, context) => {
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(size))
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const description = frame.string(encoding)
  const value = frame.string(encoding)
  const key = description ? `${context.id}/${id}/${description}` : '${context.id}/${id}'
  context[key] = value

  return decodeFrameHeader
}

const skipFrame = (id, size) => async (filehandle, context) => {
  console.warn('unsupported frame (skipping)', id)
  const { bytesRead } = await filehandle.read(Buffer.allocUnsafe(size))
  if (bytesRead < size) return
  return decodeFrameHeader
}

const FRAME_DECODERS = [
  [/^PIC$/,  decodePICFrameLegacy],
  [/^T..$/,  decodeTextFrameLegacy],
  [/^APIC$/,  decodeAPICFrame],
  [/^COMM$/,  decodeCOMMFrame],
  [/^PRIV$/,  decodePRIVFrame],
  [/^TXXX$/,  decodeTXXXFrame],
  [/^UFID$/,  decodeUFIDFrame],
  [/^USLT$/,  decodeUSLTFrame],
  [/^T...$/,  decodeTextFrame]
]

const frameDecoder = (id, size) => {
  const decoder = FRAME_DECODERS.find(([regex]) => regex.test(id))
  // if (!decoder) console.warn('unsupported frame', id, id.length)
  return decoder && decoder[1](id, size)
}

const decodeFrameHeader = async (filehandle, context) => {
  const headerSize = 10
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(headerSize))
  if (bytesRead < headerSize) return

  const header = Readable.of(buffer)
  const id = header.string(4)
  const size = header.uint32()
  const flags = header.uint16()

  return frameDecoder(id, size)
}

const decodeFrameHeaderLegacy = async (filehandle, context) => {
  const headerSize = 6
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(headerSize))
  if (bytesRead < headerSize) return

  const header = Readable.of(buffer)
  const id = header.string(3)
  const size = header.uint24()

  return frameDecoder(id, size)
}

const decodeTagHeader = async (filehandle, context) => {
  const headerSize = 10
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(headerSize))
  if (bytesRead < headerSize) return

  const header = Readable.of(buffer)
  const id = header.string(3)
  const major = header.uint8()

  // Bail-out on unsupported major version:
  if (major > 4) return

  const revision = header.uint8()
  const flags = header.uint8()
  
  // No flags are supported just yet:
  if (flags !== 0) return
  
  context.id = `${id}v2.${major}.${revision}`
  context[context.id] = true
  header.syncsafe(4) + headerSize

  return (context.id === 'ID3v2.2.0')
    ? decodeFrameHeaderLegacy
    : decodeFrameHeader
}

const decode = async (decoder, filehandle, context) => {
  const succ = await decoder(filehandle, context)
  if (succ) await decode(succ, filehandle, context)
}

export const read = async (filehandle, info) => {
  const context = {}
  await decode(decodeTagHeader, filehandle, context)
  delete context.id
  return context
}
