import * as uint8arrays from 'uint8arrays'

class DHT {
  put (keyPath, record, value, options) {
    // Return some kind of array, which is what's expected
    return record.map(int => String(int))
  }
}

export class MockIPFSClient {
  constructor () {
    this.dht = new DHT()
  }
}

const randomString = () => Math.random().toString().slice(2)

export class MockRecord {
  constructor (
    value = '/ipfs/' + randomString(),
    signature = randomString(),
    signatureV2 = randomString(),
    validityType = 0,
    validity = '2053-07-13T23:20:50.52Z',
    sequence = 0n,
    pubKey = randomString(),
    ttl = 3600,
    data = '',
    b64 = 'DjdDKLjlsjLl77dkjf6k422lsld48d4h'
  ) {
    // TODO: make the values valid/realistic
    this.value = value
    this.signature = uint8arrays.fromString(signature)
    this.signatureV2 = uint8arrays.fromString(signatureV2)
    this.validityType = validityType
    this.validity = uint8arrays.fromString(validity)
    this.sequence = sequence
    this.pubKey = uint8arrays.fromString(pubKey)
    this.ttl = ttl
    this.data = uint8arrays.fromString(data)
    this.b64 = b64
  }

  asB64 () {
    // TODO: actually encode the values along the lines of this:
    // https://github.com/ipfs/protons/blob/master/packages/protons-runtime/src/codecs/message.ts
    return this.b64
  }
}

export class MockRequest {
  constructor () {
    this.eventListeners = {}
  }

  on (type, func) {
    this.eventListeners[type] = func
    return this
  }

  write (data) {
    const bufferData = Buffer.from(data, 'utf-8')
    this.send('data', bufferData)
  }

  end () {
    this.send('end')
  }

  send (type, data) {
    const func = this.eventListeners[type]
    if (func) {
      func(data)
    }
  }
}

export const mockValidBroadcastBody = {
  key: 'k51qzi5uqu5dhwvecw8o6pmarn6937s8bk9hvoh5v5oytigewcymwuigc6tlyu',
  record: 'QkDJkF84yhd+CHmcUdxNxtn177iUFIOSlfq4+lDA+8r2p3OIpACTHKnho+bR1OgACg1c3/+t0UIFFBFZMq71yy4MSpgBpWNUVEwbAAAADfhHWABlVmFsdWVYQS9pcGZzL2JhZnliZWlnZHlyenQ1c2ZwN3VkbTdodTc2dWg3eTI2bmYzZWZ1eWxxYWJmM29jbGd0cXk1NWZiemRpaFNlcXVlbmNlAWhWYWxpZGl0eVgeMjEyNS0wNy0xNFQwOToxNjoyOS41NDEwMDAwMDBabFZhbGlkaXR5VHlwZQA='
}
