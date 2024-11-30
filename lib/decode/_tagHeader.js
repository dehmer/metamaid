import Readable from '../readable.js'

export default async read => {
  const headerSize = 10
  const { bytesRead, buffer } = await read(headerSize)
  if (bytesRead < headerSize) return { size: 0 }

  const header = Readable.of(buffer)
  const id = header.string(3)
  if (id !== 'ID3') return { size: 0 }

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