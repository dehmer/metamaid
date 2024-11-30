export default buffer => {
  let offset = 0

  return size => {
    if (offset + size >= buffer.length) return { bytesRead: 0 }
    const subarray = buffer.subarray(offset, offset + size)
    offset += size
    return { bytesRead: size, buffer: subarray }
  }
}
