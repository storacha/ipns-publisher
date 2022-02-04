import websocket from 'websocket'
import dotenv from 'dotenv'
import debug from 'debug'
import { create as createIpfs } from 'ipfs-http-client'
import * as uint8arrays from 'uint8arrays'
import PQueue from 'p-queue'
import formatNumber from 'format-number'

dotenv.config()

const CONCURRENCY = 5
const fmt = formatNumber()

const WebSocket = websocket.client
const log = debug('ipns-pub')
log.enabled = true
log.debug = debug('ipns-pub-debug')

async function main () {
  log('ℹ️ Enable verbose logging with DEBUG=ipns-pub-debug*')
  const endpoint = process.env.ENDPOINT || 'wss://api.web3.storage'
  const url = new URL('name/*/watch', endpoint)

  /** @type {Map<string, { record: string }>} */
  const taskData = new Map()
  /** @type {Set<string>} */
  const runningTasks = new Set()
  const queue = new PQueue({ concurrency: CONCURRENCY })

  while (true) {
    const ipfs = createIpfs()

    /** @type {import('websocket').connection} */
    const conn = await new Promise((resolve, reject) => {
      const client = new WebSocket()
      client.connect(url.toString())
      client.on('connect', resolve).on('connectFailed', reject)
    })

    log(`🔌 Websocket connected to ${url}`)

    try {
      await new Promise((resolve, reject) => {
        conn.on('message', async msg => {
          const { key, value, record: b64Record } = JSON.parse(msg.utf8Data)
          const keyLog = log.extend(shorten(key))
          keyLog.enabled = true
          keyLog(`🆕 /ipns/${key} ➡️ ${value}`)

          let data = taskData.get(key)
          if (data) {
            Object.assign(data, { value, record: b64Record })
            return keyLog('👌 Already in the queue (record to publish has been updated)')
          }

          data = { value, record: b64Record }
          taskData.set(key, data)

          const start = Date.now()
          keyLog(`➕ Adding to the queue, position: ${fmt(queue.size)}`)
          queue.add(async function run () {
            // if this task is already running, lets not concurrently put
            // multiple versions for the same key!
            if (runningTasks.has(key)) {
              keyLog('🏃 Already running! Re-queue in 60s...')
              await sleep(60_000)
              if (taskData.has(key) && taskData.get(key) !== data) {
                return keyLog('⏩ Skipping re-queue, a newer update has been queued already.')
              }
              taskData.set(key, data)
              keyLog(`➕ Re-adding to the queue, position: ${fmt(queue.size)}`)
              queue.add(run)
              return
            }
            keyLog(`🏁 Starting publish (was queued for ${fmt(Date.now() - start)}ms)`)
            runningTasks.add(key)

            try {
              const data = taskData.get(key)
              if (!data) throw new Error('missing task data')
              taskData.delete(key)

              keyLog(`📣 Publishing /ipns/${key} ➡️ ${data.value}`)
              const record = uint8arrays.fromString(data.record, 'base64pad')

              for await (const e of ipfs.dht.put(`/ipns/${key}`, record)) {
                logQueryEvent(log.debug.extend(shorten(key)), e)
              }
              keyLog(`✅ Published in ${fmt(Date.now() - start)}ms`)
            } catch (err) {
              keyLog(`⚠️ Failed to put to DHT (took ${fmt(Date.now() - start)}ms)`, err)
            } finally {
              runningTasks.delete(key)
            }
          })
        })

        conn.on('error', err => reject(err))

        conn.on('close', (code, desc) => {
          reject(Object.assign(new Error(`websocket connection closed: ${desc}`), { code }))
        })
      })
    } catch (err) {
      log(err)
    }

    log('💤 Sleeping before retry')
    await sleep(60_000)
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const shorten = str => `${str.slice(0, 6)}..${str.slice(-6)}`

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

main()
