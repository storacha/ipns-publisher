/* eslint-env mocha */
import * as uint8arrays from 'uint8arrays'
import assert from 'assert'
import sinon from 'sinon'
import { MockRecord } from './scripts/mocks.js'
import { publishRecord, ipfs } from '../src/publish.js'

describe('Publish a record', () => {
  it('should pass record to IPFS client', async function () {
    const record = new MockRecord()
    const key = record.pubKey
    const value = record.value
    const b64record = record.asB64()
    const putSpy = sinon.replace(ipfs.dht, 'put', sinon.fake.returns([1, 2, 3]))
    await publishRecord(key, value, b64record)
    assert(putSpy.calledOnce, 'ipfs.put is called once')
  })
})
