const LENGTH = 128

const delimited = (start, delimiter, length = 30) => buffer => {
  const end = Math.min(
    start + length, // limit to maximal length
    buffer.indexOf(delimiter, start)
  )
  
  return end === -1
    ? undefined
    : buffer.toString('utf8', start, end).trim()
}

const fixed = (position, length) => buffer => {
  return buffer[position] !== 0
    ? buffer.toString('utf8', position, position + length)
    : undefined
}

const byte = position => buffer => {
  const value = buffer.readUInt8(position)
  return value !== -1 ? value : undefined
}

const OFFSETS = {
  'TIT1': delimited(3, 0), // TIT1 | TIT2 | TIT3
  'TPE1': delimited(33, 0), // TPE1 | TPE2
  'TALB': delimited(63, 0), // TALB
  'TORY': fixed(93, 4), // TORY | TDRC
  'COMM': delimited(97, 0), // COMM
  'TCON': byte(127)
}

const readinfo = (prefix, buffer) => {
  return Object.entries(OFFSETS).reduce((acc, [key, read]) => {
    const value = read(buffer)
    if (value) acc[`${prefix}/${key}`] = value
    return acc
  }, {})
}

export const read = async (filehandle, stat) => {
  // TODO: re-using singleton buffer does not seem to work :-(
  const { bytesRead, buffer } = await filehandle.read(Buffer.allocUnsafe(LENGTH), {
    offset: 0,
    length: LENGTH,
    position: stat.size - LENGTH
  })

  // TODO: check for ID3v1.1
  const prefix = 'ID3v1'

  if ('TAG' === buffer.toString('utf8', 0, 3)) return readinfo(prefix, buffer)
  else return {}
}
