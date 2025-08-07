import * as ipns from 'ipns'
import { validate as ipnsValidate } from 'ipns/validator'
import * as keys from '@libp2p/crypto/keys'
import * as Digest from 'multiformats/hashes/digest'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { parseAndValidateCID } from './utils/ipfs.js'
import { getBody } from './utils/http/requests.js'
import { addToQueue } from './publish.js'

/**
 * @typedef {{ status: number, headers?: Record<string, string> } & ({ json: any } | { html: string })} InboundEndpointResponse
 * @typedef {(request: import('http').IncomingMessage) => Promise<InboundEndpointResponse>} InboundHandler
 */

/**
 * Receive a POST request containing an IPNS record and key to be queued to be added to the DHT
 * Expects a JSON payload containing:
 *  - `key` - key of the record to be published.
 *  - `record` - base64-encoded record to be published.
 * @param {import('http').IncomingMessage} request
 * @returns {Promise<InboundEndpointResponse>}
 */
export async function broadcast (request) {
  const body = (await getBody(request)) || '{}' // Avoid JSON parse error if empty

  const payload = JSON.parse(body)
  for (const name of ['key', 'record']) {
    if (payload[name] === undefined) {
      return {
        status: 400,
        json: { message: `JSON payload missing key '${name}'` }
      }
    }
  }
  const { key, record } = payload
  let keyCid
  try {
    keyCid = parseAndValidateCID(key)
  } catch (/** @type {any} */ error) {
    return {
      status: 400,
      json: { message: error.message }
    }
  }

  const recordBytes = uint8ArrayFromString(record, 'base64pad')
  /** @type {ipns.IPNSRecord|undefined} */
  let entry
  let pubKey

  try {
    entry = ipns.unmarshalIPNSRecord(recordBytes)
  } catch (/** @type {any} */ error) {
    return {
      status: 400,
      json: { message: `Invalid record: ${error.message}` }
    }
  }

  try {
    pubKey = keys.publicKeyFromProtobuf(Digest.decode(keyCid.multihash.bytes).bytes)
  } catch (/** @type {any} */ error) {
    return {
      status: 400,
      json: { message: `Invalid key: ${error.message}` }
    }
  }

  try {
    await ipnsValidate(pubKey, recordBytes)
  } catch (/** @type {any} */ error) {
    return {
      status: 400,
      json: { message: `invalid ipns entry: ${error.message}` }
    }
  }

  if (entry.pubKey !== undefined && !keys.publicKeyFromProtobuf(entry.pubKey).equals(pubKey)) {
    return {
      status: 404,
      json: { message: 'embedded public key mismatch' }
    }
  }

  // We *could* fetch the existing record from the DHT to check that the one we're trying to
  // publish is newer. But given that the '/broadcast' endpoint is private to w3name, and w3name
  // will have already checked the sequence number against its own copy of the existing record,
  // checking it again here is probably not worth it. Also the DHT garbage collection understands
  // sequence numbers and so will sort them out eventually anyway.

  addToQueue(key, entry.value, record)

  return {
    status: 200,
    json: { message: 'Record added to queue for publishing.' }
  }
}

/**
 * Basic page for the root URL.
 *
 * @returns {Promise<InboundEndpointResponse>}
 */
export async function siteRoot () {
  return {
    status: 200,
    html: `<body style="font-family: -apple-system, system-ui">
      <h1>⁂</h1>
      <p>IPNS records can be published to the /broadcast endpoint.</p>
    </body>`
  }
}
