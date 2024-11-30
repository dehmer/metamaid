import readBuffer from './readBuffer.js'
import sliceBuffer from './sliceBuffer.js'
import tagHeader from './decode/_tagHeader.js'
import frameHeader from './decode/_frameHeader.js'

const decode = (decoder, read, context) => {
  const succ = decoder(read, context)
  if (succ) decode(succ, read, context)
}

export const read = async (filehandle, info) => {
  const read = readBuffer(filehandle)
  const { id, size } = await tagHeader(read)
  if (size === 0) return {}

  const { bytesRead, buffer } = await read(size)
  if (bytesRead !== size) return {}

  const slice = sliceBuffer(buffer)
  const context = { id, [id]: true }
  decode(frameHeader(context), slice, context)

  delete context.id
  return context
}
