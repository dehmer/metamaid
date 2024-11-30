export default
  filehandle =>
    size =>
      filehandle.read(Buffer.allocUnsafe(size))
