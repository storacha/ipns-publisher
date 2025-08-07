import * as uint8arrays from 'uint8arrays'
import debug from 'debug'
import fmt from 'humanize-duration'
import PQueue from 'p-queue'
import { shorten } from './utils/string.js'
import { create as createIpfs } from 'kubo-rpc-client'

export const ipfs = createIpfs()

/** @param {number} ms */
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
export const sleepTimer = 60_000

const CONCURRENCY = 20
const DHT_PUT_TIMEOUT = 300_000

const log = debug('ipns:pub')
log.enabled = true
const debugLog = debug('ipns:pub:debug')

/** @type {Map<string, { value: string, b64record: string }>} */
const taskData = new Map()
/** @type {Set<string>} */
const runningTasks = new Set()
/** @type {PQueue} */
export const queue = new PQueue({ concurrency: CONCURRENCY })

/**
 * Queues the IPNS record to be added to the DHT.
 * @param {string} key Public key of the record.
 * @param {string} value The `value` field of the record.
 * @param {string} b64record Base 64 encoded serialized IPNS record.
 */
export function addToQueue (key, value, b64record) {
  const keyLog = log.extend(shorten(key))
  keyLog.enabled = true

  let data = taskData.get(key)
  if (data) {
    Object.assign(data, { value, b64record })
    return keyLog('👌 Already in the queue (record to publish has been updated)')
  }

  data = { value, b64record }
  taskData.set(key, data)

  const start = Date.now()
  keyLog(`➕ Adding to the queue, position: ${queue.size.toLocaleString()}`)
  queue.add(async function run () {
    // if this task is already running, lets not concurrently put
    // multiple versions for the same key!
    if (runningTasks.has(key)) {
      keyLog('🏃 Already running! Re-queue in 60s...')
      await sleep(sleepTimer)

      const existingData = taskData.get(key)
      if (existingData && existingData.b64record !== data.b64record) {
        return keyLog('⏩ Skipping re-queue, a newer update has been queued already.')
      }

      // Add back into queue
      taskData.set(key, data)
      keyLog(`➕ Re-adding to the queue, position: ${queue.size.toLocaleString()}`)
      queue.add(run)
      return
    }

    keyLog(`🏁 Starting publish (was queued for ${fmt(Date.now() - start)})`)
    runningTasks.add(key)

    try {
      const data = taskData.get(key)
      if (!data) throw new Error('missing task data')
      taskData.delete(key)
      await publishRecord(key, data.value, data.b64record)
    } finally {
      runningTasks.delete(key)
    }
  })
}

/**
 * Publish the given base64-encoded IPNS record for the given public key to the DHT.
 * @param {string} key Public key of the record.
 * @param {string} value The `value` field of the record.
 * @param {string} b64record Base 64 encoded serialized IPNS record.
 * @returns {Promise<void>}
 */
export async function publishRecord (key, value, b64record) {
  const keyLog = log.extend(shorten(key))
  const start = Date.now()
  let timeoutId
  try {
    keyLog(`📣 Publishing /ipns/${key} ➡️ ${value}`)
    keyLog.enabled = true
    const recordUint8 = uint8arrays.fromString(b64record, 'base64pad')

    const controller = new AbortController()
    timeoutId = setTimeout(() => controller.abort(), DHT_PUT_TIMEOUT)

    const keyLogDebug = debugLog.extend(shorten(key))
    for await (const e of ipfs.routing.put(`/ipns/${key}`, recordUint8, { signal: controller.signal })) {
      keyLogDebug(e)
    }
    keyLog(`✅ Published in ${fmt(Date.now() - start)}`)
  } catch (err) {
    keyLog(`⚠️ Failed to put to DHT (took ${fmt(Date.now() - start)})`, err)
  } finally {
    clearTimeout(timeoutId)
  }
}
