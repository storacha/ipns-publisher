/* eslint-env serviceworker */
import { Router } from 'itty-router'
/* global process */
import { create as createIpfs } from 'ipfs-http-client'
import * as ipns from 'ipns'
import { validate as ipnsValidate } from 'ipns/validator'
import { keys } from 'libp2p-crypto'
import * as Digest from 'multiformats/hashes/digest'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { getValueFromDHT, parseAndValidateCID } from './utils/ipfs.js'
import { canOverwrite } from './utils/ipns.js'
import { JSON404, JSON500, JSONResponse } from './utils/http/responses.js'
import { publishRecord } from './publish.js'

// We might use a different router, depending on how this is hosted
const router = Router()
router.options('*', corsOptions)
router.post('/broadcast', broadcast)
router.get('/', siteRoot)
router.all('*', () => JSON404())

/**
 * Receive a POST request containing an IPNS record and publish it to the DHT.
 * Expects a JSON payload containing:
 *  - `key` - key of the record to be published.
 *  - `record` - base64-encoded record to be published.
 * @returns {Promise<JSONResponse>}
 */
async function broadcast (request, env, ctx) {
  const payload = await request.json()
  ['key', 'record'].forEach((name) => {
    if (payload[name] === undefined) {
      return JSONResponse({ message: `JSON payload missing key ${name}` }, { status: 400 })
    }
  })
  const { key, record } = payload
  let keyCid
  try {
    keyCid = parseAndValidateCID(key)
  } catch (err) {
    return JSONResponse({ message: err.message }, { status: 400 })
  }
  const entry = ipns.unmarshal(uint8ArrayFromString(record, 'base64pad'))
  const pubKey = keys.unmarshalPublicKey(Digest.decode(keyCid.multihash.bytes).bytes)

  try {
    await ipnsValidate(pubKey, entry)
  } catch (error) {
    return JSONResponse(
      { message: `invalid ipns entry: ${error.message}` },
      { status: 400 }
    )
  }

  if (entry.pubKey !== undefined && !keys.unmarshalPublicKey(entry.pubKey).equals(pubKey)) {
    return JSONResponse('embedded public key mismatch', { status: 404 })
  }

  // Fetch the existing record from the DHT to check that the one we're trying to
  // publish is newer.
  const existingRecordB64 = getValueFromDHT(`/ipns/${key}`)
  if (existingRecordB64) {
    const existingRecord = ipns.unmarshal(existingRecordB64)
    if (!canOverwrite(existingRecord, entry)) {
      return JSONResponse(
        { message: 'supplied record is older or has lower sequence number than existing record'},
        { status: 400 }
        )
      }
    }

  const ipfs = createIpfs()
  publishRecord(ipfs, key, entry.value, record)
  return JSONResponse({ message: 'Success' })
}

/**
 * Basic page for the root URL.
 * @returns Response
 */
function siteRoot () {
  return new Response(
    `
<body style="font-family: -apple-system, system-ui">
  <h1>⁂</h1>
  <p>IPNS records can be published to the /broadcast endpoint.</p>
</body>`,
    {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=UTF-8'
      }
    }
  )
}

// https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent
/** @typedef {{ waitUntil(p: Promise): void }} Ctx */

/**
 * HTTP server entrypoint. This may be changed depending on how/where we run this.
 */
export default {
  async fetch (request, env, ctx) {
    let response
    try {
      env = { ...env } // new env object for every request (it is shared otherwise)!
      response = await router.handle(request, env, ctx)
    } catch (error) {
      response = JSON500(error, request, env)
    }
    return response
  }
}
