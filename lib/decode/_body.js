import header from './_header.js'
import APIC from './APIC.js'
import COM from './COM.js'
import COMM from './COMM.js'
import MCDI from './MCDI.js'
import PIC from './PIC.js'
import T___ from './T___.js'
import T__ from './T__.js'
import TXXX from './TXXX.js'
import UFID from './UFID.js'
import USLT from './USLT.js'

const ignoredFrame = (id, size) => (read, context) => {
  const { bytesRead } = read(size) // read (and ignore) frame to continue reading
  if (bytesRead < size) return
  else header(context)
}

const unsupportedFrame = (id, size) => (read, context) => {
  console.warn('unsupported frame', id)
  const { bytesRead } = read(size) // read (and ignore) frame to continue reading
  if (bytesRead < size) return
  else header(context)
}

const FRAME_DECODERS = [
  [/^COM$/,  COM],
  [/^PCS$/,  ignoredFrame],
  [/^PIC$/,  PIC],
  [/^RVA$/,  ignoredFrame], // Relative volume adjustment
  [/^T..$/,  T__],
  [/^UFI$/,  ignoredFrame],
  [/^ULT$/,  ignoredFrame],
  [/^APIC$/, APIC],
  [/^COMM$/, COMM],
  [/^GEOB$/, ignoredFrame],
  [/^MCDI$/, MCDI],
  [/^NCON$/, ignoredFrame],
  [/^PCNT$/, ignoredFrame],
  [/^PCST$/, ignoredFrame],
  [/^POPM$/, ignoredFrame],
  [/^PRIV$/, ignoredFrame],
  [/^RGAD$/, ignoredFrame],
  [/^RVAD$/, ignoredFrame], // Relative volume adjustment
  [/^RVA2$/, ignoredFrame], // Relative volume adjustment (2)
  [/^TXXX$/, TXXX],
  [/^UFID$/, UFID],
  [/^USER$/, ignoredFrame],
  [/^USLT$/, USLT],
  [/^XSOP$/, ignoredFrame],
  [/^W...$/, ignoredFrame],
  [/^T...$/, T___],
  [/^\w{3,4}$/, unsupportedFrame]
]

export default (id, size) => {
  if (!id.trim()) return
  const decoder = FRAME_DECODERS.find(([regex]) => regex.test(id))
  return decoder && decoder[1](id, size)
}
