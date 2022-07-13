/* eslint-env mocha */
import * as uint8arrays from 'uint8arrays'
import assert from 'assert'
import sinon from 'sinon'
import { MockIPFSClient, MockRecord } from './scripts/mocks.js'
import { publishRecord } from '../src/publish.js'

describe('Publish a record', () => {
  it('should pass record to IPFS client', async function () {
    const ipfs = new MockIPFSClient()
    const record = new MockRecord()
    const key = record.pubKey
    const value = record.value
    const b64record = record.asB64()
    const putSpy = sinon.spy(ipfs.dht, 'put')
    publishRecord(ipfs, key, value, b64record)
    assert(putSpy.calledOnce, 'ipfs.put is called once')
  })
})
