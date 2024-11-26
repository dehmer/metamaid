import fs from 'node:fs'
import { randomUUID } from 'node:crypto'

const Readable = function Readable (buffer) {
  this.buffer = buffer
  this.offset = 0
}

Readable.of = buffer => new Readable(buffer)

Readable.prototype.subarray = function (end) {
  const value = this.buffer.subarray(this.offset, end)
  this.offset = this.buffer.length
    return value
}

Readable.prototype.stringFixed = function (length, encoding = 'latin1') {
  const value = this.buffer.toString(encoding, this.offset, this.offset + length)
  this.offset += length

  // Strip trailing 0x00 if necessary:
  return value.charAt(value.length - 1) === '\x00'
    ? value.substring(0, value.length - 1)
    : value
}

Readable.prototype.stringDelimited = function (delimiter, encoding = 'latin1') {
  const index = this.buffer.indexOf(delimiter, this.offset)
  const value = this.buffer.toString(encoding, this.offset, index)
  this.offset = index + 1 // skip delimiter
  return value
}

Readable.prototype.uint8 = function () {
  const value = this.buffer.readUInt8(this.offset)
  this.offset++
  return value
}

Readable.prototype.uint16 = function () {
  const value = this.buffer.readUInt16BE(this.offset)
  this.offset += 2
  return value
}

Readable.prototype.uint24 = function () {
  const value = 
    (this.buffer.readUInt8(this.offset    ) << 16) +
    (this.buffer.readUInt8(this.offset + 1) <<  8) + 
    (this.buffer.readUInt8(this.offset + 2))
  this.offset += 3
  return value
}

Readable.prototype.uint32 = function () {
  const value = this.buffer.readUInt32BE(this.offset)
  this.offset += 4
  return value
}

Readable.prototype.encoding = function () {

  // 00 – ISO-8859-1 (ASCII).
  // 01 – UCS-2 (UTF-16 encoded Unicode with BOM), in ID3v2.2 and ID3v2.3.
  // 02 – UTF-16BE encoded Unicode without BOM, in ID3v2.4.  
  // 03 – UTF-8 encoded Unicode, in ID3v2.4.

  switch (this.uint8()) {
    case 0: return 'latin1' // a.k.a. ISO-8859-1 (ASCII)
    case 1: return 'ucs-2' 
    case 2: return 'utf16le' 
    case 3: return 'utf8'
    default: return 'latin1'
  }
}

Readable.prototype.syncsafe = function (length) {
  return [...Array(length).keys()]
    .map(i => length - i - 1)
    .reduce((acc, exp) => acc + this.uint8() * 128 ** exp, 0)
}

const decodeTextFrame = (id, size) => async (filehandle, context) => {
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(size))
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const value = frame.stringFixed(size, encoding) // FIXME: ...
  context[`${context.id}/${id}`] = value

  return decodeFrameHeader
}

const decodeTextFrameLegacy = (id, size) => async (filehandle, context) => {
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(size))
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const value = frame.stringFixed(size, encoding) // FIXME: ...
  context[`${context.id}/${id}`] = value

  return decodeFrameHeaderLegacy
}

const decodeAPICFrame = (id, size) => async (filehandle, context) => {
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(size))
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const mimetype = frame.stringDelimited(0)
  const type = frame.uint8()
  const description = frame.stringDelimited(0, encoding).trim()
  const data = frame.subarray()
  context[`${context.id}/${id}`] ??= []

  context[`${context.id}/${id}`].push({
    mimetype,
    type,
    description,
    data
  })

  return decodeFrameHeader
}

const decodeAPICFrameLegacy = (id, size) => async (filehandle, context) => {
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(size))
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const format = frame.stringFixed(3)
  const type = frame.uint8()
  const description = frame.stringDelimited(0, encoding).trim()
  const data = frame.subarray()
  context[`${context.id}/${id}`] ??= []

  context[`${context.id}/${id}`].push({
    format,
    type,
    description,
    data
  })

  return decodeFrameHeaderLegacy
}

const decodeCOMMFrame = (id, size) => async (filehandle, context) => {
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(size))
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const language = frame.stringFixed(3)
  const description = frame.stringDelimited(0, encoding)
  const text = frame.stringFixed(size - frame.offset, encoding)

  context[`${context.id}/${id}`] ??= []
  context[`${context.id}/${id}`].push({
    language,
    encoding,
    description,
    text 
  })

  return decodeFrameHeader
}

const decodeUFIDFrame = (id, size) => async (filehandle, context) => {
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(size))
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const owner = frame.stringDelimited(0)
  const identifier = frame.stringFixed(size - frame.offset)
  context[`${context.id}/${id}/OWNER`] = owner
  context[`${context.id}/${id}/ID`] = identifier

  return decodeFrameHeader
}

const decodeUSLTFrame = (id, size) => async (filehandle, context) => {
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(size))
  if (bytesRead < size) return

  const frame = Readable.of(buffer)
  const encoding = frame.encoding()
  const language = frame.stringFixed(3)
  const descriptor = frame.stringDelimited(0)
  const text = frame.stringFixed(size - frame.offset, encoding)
  context[`${context.id}/${id}/${language}`] = text

  return decodeFrameHeader
}

const skipFrame = (id, size) => async (filehandle, context) => {
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(size))
  if (bytesRead < size) return
  return decodeFrameHeader
}

const FRAME_DECODERS = [
  [/^T..$/,  decodeTextFrameLegacy],
  [/^PIC$/,  decodeAPICFrameLegacy],
  [/^T...$/,  decodeTextFrame],
  [/^APIC$/,  decodeAPICFrame],
  [/^COMM$/,  decodeCOMMFrame],
  [/^PRIV$/,  skipFrame],
  [/^UFID$/,  decodeUFIDFrame],
  [/^USLT$/,  decodeUSLTFrame]
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
  const id = header.stringFixed(4)
  const size = header.uint32()
  const flags = header.uint16()

  return frameDecoder(id, size)
}

const decodeFrameHeaderLegacy = async (filehandle, context) => {
  const headerSize = 6
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(headerSize))
  if (bytesRead < headerSize) return

  const header = Readable.of(buffer)
  const id = header.stringFixed(3)
  const size = header.uint24()

  return frameDecoder(id, size)
}

const decodeTagHeader = async (filehandle, context) => {
  const headerSize = 10
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(headerSize))
  if (bytesRead < headerSize) return

  const header = Readable.of(buffer)
  const id = header.stringFixed(3)
  const major = header.uint8()

  // Bail-out on unsupported major version:
  if (major > 4) return

  const revision = header.uint8()
  const flags = header.uint8()
  
  // No flags are supported just yet:
  if (flags !== 0) return
  
  context.id = `${id}v2.${major}.${revision}`
  context.tagsize = header.syncsafe(4) + headerSize

  return (context.id === 'ID3v2.2.0')
    ? decodeFrameHeaderLegacy
    : decodeFrameHeader
}

const decode = async (decoder, filehandle, context) => {
  const succ = await decoder(filehandle, context)
  if (succ) await decode(succ, filehandle, context)
}

export const read = async (filehandle, context) => {
  console.log('reading', context.basename)
  await decode(decodeTagHeader, filehandle, context)

  // Write first image to file
  const apic = context[`${context.id}/APIC`] || context[`${context.id}/PIC`]
  if (apic) {
    const image = apic[0]
    console.log('image data', !!image)
    const ext = image.mimetype
      ? image.mimetype.substring(image.mimetype.indexOf('/') + 1)
      : image.format.toLowerCase()
    fs.writeFileSync(`/Users/dehmer/Downloads/tmp/${randomUUID()}.${ext}`, image.data)
  } else console.log('image data', false)

}
