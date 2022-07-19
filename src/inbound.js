/* global process */
import http from 'http'
import { create as createIpfs } from 'ipfs-http-client'
import * as ipns from 'ipns'
import { validate as ipnsValidate } from 'ipns/validator'
import { keys } from 'libp2p-crypto'
import * as Digest from 'multiformats/hashes/digest'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { getValueFromDHT, parseAndValidateCID } from './utils/ipfs.js'
import { writeJSON404, writeJSON500, writeJSONResponse } from './utils/http/responses.js'
import { getBody } from './utils/http/requests.js'
import { publishRecord } from './publish.js'

/**
 * Receive a POST request containing an IPNS record and publish it to the DHT.
 * Expects a JSON payload containing:
 *  - `key` - key of the record to be published.
 *  - `record` - base64-encoded record to be published.
 * @returns {Promise<JSONResponse>}
 */
export async function broadcast (request, response) {
  const body = (await getBody(request)) || '{}'  // Avoid JSON parse error if empty
  const payload = JSON.parse(body);
  for (const name of ['key', 'record']) {
    if (payload[name] === undefined) {
      writeJSONResponse(response, { message: `JSON payload missing key '${name}'` }, 400)
      return
    }
  }
  const { key, record } = payload
  let keyCid
  try {
    keyCid = parseAndValidateCID(key)
  } catch (err) {
    writeJSONResponse(response, { message: err.message }, 400)
    return
  }
  const entry = ipns.unmarshal(uint8ArrayFromString(record, 'base64pad'))
  const pubKey = keys.unmarshalPublicKey(Digest.decode(keyCid.multihash.bytes).bytes)

  try {
    await ipnsValidate(pubKey, entry)
  } catch (error) {
    writeJSONResponse(
      response,
      { message: `invalid ipns entry: ${error.message}` },
      400
    )
    return
  }

  if (entry.pubKey !== undefined && !keys.unmarshalPublicKey(entry.pubKey).equals(pubKey)) {
    writeJSONResponse(response, 'embedded public key mismatch', 404)
    return
  }

  // TODO: Fetch the existing record from the DHT to check that the one we're trying to
  // publish is newer.  This isn't a massive problem, as we've checked the signature, so
  // someone can only overwrite their own records, and the DHT garbage collection will
  // sort them out eventually anyway, but it might be a nice thing to add.

  const ipfs = createIpfs()
  publishRecord(ipfs, key, entry.value, record)
  writeJSONResponse(response, { message: 'Success' })
}

/**
 * Basic page for the root URL.
 */
function siteRoot (request, response) {
  response.writeHead(200, {
    'content-type': 'text/html; charset=UTF-8'
  })
  response.end(
    `<body style="font-family: -apple-system, system-ui">
    <h1>⁂</h1>
    <p>IPNS records can be published to the /broadcast endpoint.</p>
    </body>`
    )
}

const host = process.env.INBOUND_HOSTNAME || '127.0.0.1'
const port = parseInt(process.env.INBOUND_PORT || 8000, 10)
const routes = {
  '/': siteRoot,
  '/broadcast': broadcast
}

/**
 * HTTP server entrypoint. This may be changed depending on how/where we run this.
 */
async function router(request, response) {
  try {
    let handler = routes[request.url]
    if (handler === undefined) {
      writeJSON404(response)
      return
    }
    await handler(request, response)
  } catch (error) {
    writeJSON500(response, error)
  }
  if (!response.writableEnded) {
    writeJSON500(response, new Error('Script failed to generate a response'))
  }
  console.log(`[${response.statusCode}] ${request.url}`)
}

const server = http.createServer(router);
server.listen(port, host, () => {
  console.log(`Inbound server is running on http://${host}:${port}`);
});
