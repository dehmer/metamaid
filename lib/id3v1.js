import Readable from './readable.js'

const string = (offset, length) => readable => {
  readable.position(offset)
  const index = readable.indexOf(0)
  const maxlength = index !== -1 ? Math.min(length, index - offset) : length
  const value = readable.string(maxlength)
  return value
}

const uint8 = offset => readable => {
  readable.position(offset)
  const value = readable.uint8()
  return value !== -1 ? value : undefined
}

const comment = readable => {
  readable.position(125)
  const length = readable.uint8() === 0 ? 28 : 30
  return string(97, length)(readable)
}

const track = readable => {
  readable.position(125)
  return readable.uint8() === 0
    ? readable.uint8()
    : undefined
}

const OFFSETS = {
  'TIT1': string(3, 30), // TIT1 | TIT2 | TIT3
  'TPE1': string(33, 30), // TPE1 | TPE2
  'TALB': string(63, 30), // TALB
  'TORY': string(93, 4), // TORY | TDRC
  'COMM': comment, // COMM
  'TRCK': track,
  'TCON': uint8(127)
}

const readinfo = (prefix, readable) => {
  return Object.entries(OFFSETS).reduce((acc, [key, read]) => {
    const value = read(readable)
    if (value) acc[`${prefix}/${key}`] = value
    return acc
  }, { [prefix]: true })
}

export const read = async (filehandle, stat) => {
  const length = 128
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(length), {
    length,
    offset: 0,
    position: stat.size - length
  })

  if (bytesRead !== length) return {}
  const tag = Readable.of(buffer)

  if ('TAG' === tag.string(3)) {
    const prefix = buffer.readUInt8(125) === 0 ? 'ID3v1.1' : 'ID3v1'
    return readinfo(prefix, tag)
  }
  else return {}
}
