import websocket from 'websocket'
import dotenv from 'dotenv'
import debug from 'debug'
import { create as createIpfs } from 'ipfs-http-client'
import * as uint8arrays from 'uint8arrays'

dotenv.config()

const WebSocket = websocket.client
const log = debug('ipns-pub')
log.enabled = true
log.debug = debug('ipns-pub-debug')

async function main () {
  log('ℹ️ Enable verbose logging with DEBUG=ipns-pub-debug*')
  const endpoint = process.env.ENDPOINT || 'wss://api.web3.storage'
  const url = new URL('name/*/watch', endpoint)

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
          keyLog(`🆕 ${key} => ${value}`)
          const start = Date.now()
          const record = uint8arrays.fromString(b64Record, 'base64pad')
          for await (const e of ipfs.dht.put(`/ipns/${key}`, record)) {
            logQueryEvent(log.debug.extend(shorten(key)), e)
          }
          keyLog(`⏱ Updated in ${Date.now() - start}ms`)
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
    await new Promise(resolve => setTimeout(resolve, 60_000))
  }
}

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
