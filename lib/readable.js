const decode = encoding => function (length) {
  if (length) {
    const value = this.buffer.toString(encoding, this.offset, this.offset + length)
    this.offset += length
    return value
  }
  else {
    const index = this.buffer.indexOf(0, this.offset)
    const end = index === -1 ? this.buffer.length : Math.min(index, this.buffer.length)
    const value = this.buffer.toString(encoding, this.offset, end)
    this.offset = end + (index === -1 ? 0 : 1)    
    return value
  }
}

const decodeUcs2 = function () {
  const bom = this.uint16()
  if (bom === 0) return ''
  if (bom !== 0xfffe && bom !== 0xfeff) {
    console.warn(`invalid BOM: 0x${bom.toString(16)}`, this.buffer)
    return
  }

  const read = bom === 0xfffe
    ? this.buffer.readUInt16LE.bind(this.buffer)
    : this.buffer.readUInt16BE.bind(this.buffer)

  const xs = []
  while (this.offset < this.buffer.length) {
    const code = read(this.offset)
    this.offset += 2
    if (!code) break; // 0x0000 terminated
    xs.push(String.fromCharCode(code))
  }
  
  return xs.join('')
}

const Readable = function Readable (buffer) {
  this.buffer = buffer
  this.offset = 0
  this['latin1'] = decode('latin1').bind(this)
  this['utf8'] = decode('utf8').bind(this)
  this['ucs-2'] = decodeUcs2.bind(this)
}

Readable.of = buffer => new Readable(buffer)

Readable.prototype.position = function (offset) {
  this.offset = offset
}

Readable.prototype.indexOf = function (value) {
  return this.buffer.indexOf(value, this.offset)
}

Readable.prototype.subarray = function (end) {
  end ??= this.buffer.length
  const value = this.buffer.subarray(this.offset, end)
  this.offset = end
  return value
}

Readable.prototype.string = function (...args) {
  const { encoding, length } = args.reduce((acc, arg) => {
    if (typeof arg === 'number') acc.length = arg
    else if (typeof arg === 'string') acc.encoding = arg
    return acc
  }, { encoding: 'latin1' })

  const decoder = this[encoding]
  if (!decoder) {
    console.warn('unsupported encoding', encoding)
    return
  }

  return decoder(length)
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

export default Readable
