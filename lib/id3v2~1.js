import * as R from 'ramda'

const HEADER_LENGTH = 10

const FLAGS = [
  'unsynchronization',
  'compression',
  'extended',
  'experimental',
  'footer'
]

const fixed = R.curry((position, length, buffer) => {
  return buffer[position] !== 0
    ? buffer.toString('utf8', position, position + length)
    : undefined
})

const uint8 = R.curry((position, buffer) => buffer.readUInt8(position))
const uint16 = R.curry((position, buffer) => buffer.readUInt16BE(position))
const uint32 = R.curry((position, buffer) => buffer.readUInt32BE(position))

const syncsafe = (position, length, buffer) =>
  R.range(0, length)
    .map(offset => [position + offset, 128 ** (length - offset - 1)])
    .reduce((acc, [position, factor]) => acc + uint8(position, buffer) * factor, 0)

const readFlags = (id, header) => {
  const flags = {}
  const value = uint8(5, header)

  flags.unsynchronization = (value & 0x80) === 0x80
  if (id === 'ID3v2.2.0') flags.compression = (value & 0x40) === 0x40
  else flags.extended = (value & 0x40) === 0x40
  if (id === 'ID3v2.3.0' || id === 'ID3v2.4.0') flags.experimental = (value & 0x20) === 0x10
  if (id === 'ID3v2.4.0') flags.footer = (value & 0x10) === 0x10
  return flags
}

const isID3 = buffer => fixed(0, 3, buffer) === 'ID3'

const decodeHeaderInfo = buffer => {
  const major = uint8(3, buffer)
  const revision = uint8(4, buffer)
  const id = `ID3v2.${major}.${revision}`
  const size = syncsafe(6, 4, buffer) - HEADER_LENGTH

  return {
    major,
    revision,
    id,
    size,
    ...readFlags(id, buffer)
  }
}

const decodeHeader = async filehandle => {
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(HEADER_LENGTH), {
    offset: 0,
    length: HEADER_LENGTH
  })

  return (bytesRead === HEADER_LENGTH && isID3(buffer))
    ? decodeHeaderInfo(buffer)
    : {}
}

const textDecocer = buffer => {
  console.log('textDecocer', buffer)
}

const FRAME_DECODERS = [
  [/^T...$/,  textDecocer]
]

const frameDecoder = id => {
  const decoder = FRAME_DECODERS.find(([regex, decoder]) => {
    console.log(regex, id, regex.test(id))
    return regex.test(id)
  })

  return decoder
    ? decoder[1]
    : () => {}
  }

const decodeFrames = async (header, filehandle) => {
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(header.size))
  console.log(bytesRead, buffer)
  let frameOffset = 0
  while (frameOffset < buffer.length) {
    const stop = uint8(frameOffset, buffer) === 0
    console.log('stop', stop)
    if (stop) break;

    const id = fixed(frameOffset, 4, buffer)
    const size = uint32(frameOffset + 4, buffer)
    const flags = uint16(frameOffset + 8, buffer)

    const decoder = frameDecoder(id)

    console.log(id, size, flags)
    frameOffset += (size + 10)
    console.log(frameOffset, buffer.length)
  }
}

export const read = async (filehandle, info) => {
  const header = await decodeHeader(filehandle)
  if (header.major > 4) return {}

  // Bail out (for now) if any flag is set.
  const exit = FLAGS.reduce((acc, name) => acc || (header[name] || false), false)
  if (exit) {
    console.warn('encountered unsupported flag', header)
    return {}
  }

  const frames = await decodeFrames(header, filehandle)
  console.log(info.basename, header)
  process.exit()
  return {}
}
