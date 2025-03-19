/**
 * Usage: node tools/publish-record.js <ipns_public_key> <ipns_record_base64pad_encoded>
 * 
 * Required environment vars:
 * PUBLISHER_ENDPOINT_URL=
 * PUBLISHER_AUTH_SECRET=
 */
import { base36 } from 'multiformats/bases/base36'
import { CID } from 'multiformats/cid'
import * as Crypto from 'libp2p-crypto'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import * as IPNS from 'ipns'
import * as Validator from 'ipns/validator'

const [,, b36Key] = process.argv
if (!b36Key) {
  console.error('')
  console.error('🚫 Missing IPNS key')
  process.exit(1)
}
const [,,, b64Record] = process.argv
if (!b64Record) {
  console.error('')
  console.error('🚫 Missing IPNS record')
  process.exit(1)
}

const key = CID.parse(b36Key, base36)
const record = IPNS.unmarshal(uint8ArrayFromString(b64Record, 'base64pad'))
const pubKey = Crypto.keys.unmarshalPublicKey(key.multihash.bytes)

await Validator.validate(pubKey, record)

const data = {
  key: b36Key, // base36 "libp2p-key" encoding of the public key
  record: b64Record, // the serialized IPNS record - base64 encoded
}

console.log('')
console.log('#️⃣ Value:')
console.log(uint8ArrayToString(record.value))

console.log('')
console.log('⏳ Expires:')
console.log(uint8ArrayToString(record.validity))

console.log('')
console.log('🔓 Decoded record:')
console.log(record)

const url = process.env.PUBLISHER_ENDPOINT_URL
if (!url) {
  console.error('')
  console.error('🚫 Missing PUBLISHER_ENDPOINT_URL env var')
  process.exit(1)
}
const secret = process.env.PUBLISHER_AUTH_SECRET
if (!secret) {
  console.error('')
  console.error('🚫 Missing PUBLISHER_AUTH_SECRET env var')
  process.exit(1)
}

console.log('')
console.log('💁 Publishing to:')
console.log(url)

const res = await fetch(url, {
  method: 'POST',
  body: JSON.stringify(data),
  headers: { Authorization: secret }
})

console.log('')
console.log('💬 Response:')
console.log(res.status)
console.log(await res.text())
