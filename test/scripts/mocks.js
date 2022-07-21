import * as uint8arrays from 'uint8arrays'

class DHT {
  put(keyPath, record, value, options) {
    // Return some kind of array, which is what's expected
    return record.map(int => String(int))
  }
}

export class MockIPFSClient {
  constructor () {
    this.dht = new DHT()
  }
}

export class MockRecord {
  constructor (
    value = '/ipfs/abcde12345',
    signature = 'xyzABC123',
    signatureV2 = 'xyzABC123',
    validityType = 0,
    validity = '2023-07-13T23:20:50.52Z',
    sequence = 0,
    pubKey = 'abcXYZ456',
    ttl = 3600,
    data = '',
    b64 = 'DjdDKLjlsjLl77dkjf6k422lsld48d4h'
  ) {
    // TODO: make the values valid/realistic
    this.value = uint8arrays.fromString(value)
    this.signature = uint8arrays.fromString(signature)
    this.signatureV2 = uint8arrays.fromString(signatureV2)
    this.validityType = uint8arrays.fromString(validityType)
    this.validity = uint8arrays.fromString(validity)
    this.sequence = uint8arrays.fromString(sequence)
    this.pubKey = uint8arrays.fromString(pubKey)
    this.ttl = ttl
    this.data = data
    this.b64 = b64
  }

  asB64 () {
    // TODO: actually encode the values along the lines of this:
    // https://github.com/ipfs/protons/blob/master/packages/protons-runtime/src/codecs/message.ts
    return this.b64
  }
}
