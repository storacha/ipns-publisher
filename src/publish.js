/* global AbortController */
import * as uint8arrays from 'uint8arrays'
import debug from 'debug'
import formatNumber from 'format-number'
import { shorten } from './utils/string.js'

const DHT_PUT_TIMEOUT = 60_000
const fmt = formatNumber()

const log = debug('ipns-pub')
log.enabled = true
log.debug = debug('ipns-pub-debug')

/**
 * Publish the given base64-encoded IPNS record for the given public key to the DHT.
 * @param {object} ipfs IPFS client.
 * @param {string} key Public key of the record.
 * @param {string} value The `value` field of the record.
 * @param {string} b64record Base 64 encoded serialized IPNS record.
 * @returns {undefined}
 */
export async function publishRecord(ipfs, key, value, b64record) {
  const keyLog = log.extend(shorten(key))
  const start = Date.now()
  let timeoutId
  try {
    keyLog(`📣 Publishing /ipns/${key} ➡️ ${value}`)
    keyLog.enabled = true
    const recordUint8 = uint8arrays.fromString(b64record, 'base64pad')

    const controller = new AbortController()
    timeoutId = setTimeout(() => controller.abort(), DHT_PUT_TIMEOUT)

    for await (const e of ipfs.dht.put(`/ipns/${key}`, recordUint8, { signal: controller.signal })) {
      logQueryEvent(log.debug.extend(shorten(key)), e)
    }
    keyLog(`✅ Published in ${fmt(Date.now() - start)}ms`)
  } catch (err) {
    keyLog(`⚠️ Failed to put to DHT (took ${fmt(Date.now() - start)}ms)`, err)
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * @param {debug.Debugger} log
 * @param {import('ipfs-core-types/src/dht').QueryEvent} e
 */
function logQueryEvent (log, e) {
  switch (e.name) {
    case 'VALUE':
      log(`Type: ${e.name} From: ${e.from} Value: ${uint8arrays.toString(e.value, 'base64pad')}`)
      break
    case 'SENDING_QUERY':
      log(`Type: ${e.name} To: ${e.to}`)
      break
    case 'PEER_RESPONSE':
      log(`Type: ${e.name} From: ${e.from} Message: ${e.messageName} Closer: ${e.closer.length} Providers: ${e.providers.length}`)
      break
    case 'DIALING_PEER':
      log(`Type: ${e.name} Peer: ${e.peer}`)
      break
    default:
      log(`Type: ${e.name}`)
  }
}
