import { base36 } from 'multiformats/bases/base36'
import { CID } from 'multiformats/cid'

const libp2pKeyCode = 0x72

/**
 * @param {CID} cid
 */
function validateCIDKeyCode (cid) {
  if (cid.code !== libp2pKeyCode) {
    throw new Error(`invalid key, expected: ${libp2pKeyCode} codec code but got: ${cid.code}`)
  }
}

/**
 * @param {string} cid
 */
export function parseAndValidateCID (key) {
  let cid
  try {
    cid = CID.parse(key, base36)
  } catch (err) {
    throw new Error('invalid key')
  }
  validateCIDKeyCode(cid)
  return cid
}
