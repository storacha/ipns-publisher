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
  constructor () {
    // TODO: make the values valid/realistic
    this.value =  uint8arrays.fromString('/ipfs/abcde12345')
    this.signature =  uint8arrays.fromString('xyzABC123')
    this.signatureV2 =  uint8arrays.fromString('xyzABC123')
    this.validityType =  uint8arrays.fromString(0)
    this.validity =  uint8arrays.fromString('2023-07-13T23:20:50.52Z')
    this.sequence =  uint8arrays.fromString(0)
    this.pubKey =  uint8arrays.fromString('abcXYZ456')
    this.ttl = 3600
    this.data = ''
  }

  asB64 () {
    // TODO: actually encode the values along the lines of this:
    // https://github.com/ipfs/protons/blob/master/packages/protons-runtime/src/codecs/message.ts
    return 'DjdDKLjlsjLl77dkjf6k422lsld48d4h'
  }
}
