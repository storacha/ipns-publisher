import websocket from 'websocket'
import dotenv from 'dotenv'
import debug from 'debug'
import { create as createIpfs } from 'ipfs-http-client'
import { fromString as uint8ArrayFromString } from 'uint8arrays'

dotenv.config()

const WebSocket = websocket.client
const log = debug('ipns-pub')

async function main () {
  if (!log.enabled) {
    console.log('Enable logging by setting DEBUG=ipns-pub')
  }

  const endpoint = process.env.ENDPOINT || 'wss://api-staging.web3.storage'
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
          log(`🆕 ${key} => ${value}`)
          const record = uint8ArrayFromString(b64Record, 'base64pad')
          for await (const qe of ipfs.dht.put(key, record)) {
            log(`📞 ${key} ${JSON.stringify(qe)}`)
          }
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

main()
