/* eslint-env mocha */
import assert from 'assert'
import sinon from 'sinon'
import { toString } from 'uint8arrays'
import { MockRecord } from './scripts/mocks.js'
import { publishRecord, addToQueue, ipfs, queue } from '../src/publish.js'
import { beforeEach, afterEach } from 'mocha'

describe('Handles publishing records', () => {
  it('should publish a record after it is queued', async () => {
    const putSpy = sinon.replace(ipfs.routing, 'put', sinon.fake.returns([1, 2, 3]))
    const record = new MockRecord()
    const key = toString(record.pubKey)
    const value = record.value

    addToQueue(key, value, record.asB64())
    assert(putSpy.calledOnce, 'Record is published to the DHT.')
    sinon.restore()
  })

  describe('When adding something to the queue', () => {
    let queueAddSpy
    beforeEach((done) => {
      queueAddSpy = sinon.stub(queue, 'add').callsFake(sinon.fake.returns([1, 2, 3]))
      done()
    })

    afterEach(() => {
      queueAddSpy.restore()
    })

    it('should queue a record to be published', async function () {
      const record = new MockRecord()
      const key = toString(record.pubKey)
      const value = record.value
      const b64record = record.asB64()
      addToQueue(key, value, b64record)
      assert(queueAddSpy.calledOnce, 'queue.add is called once')
    })

    it('should not queue the same record twice', async function () {
      const record = new MockRecord()
      const key = toString(record.pubKey)
      const value = record.value
      const b64record = record.asB64()
      addToQueue(key, value, b64record)
      assert(queueAddSpy.calledOnce, 'queue.add is called once')
      addToQueue(key, value, b64record)
      assert(queueAddSpy.calledOnce, 'queue.add is not called a second time')
    })
  })

  describe('When publishing a record', () => {
    it('should pass record to IPFS client', async function () {
      const record = new MockRecord()
      const key = toString(record.pubKey)
      const value = record.value
      const b64record = record.asB64()
      const putSpy = sinon.replace(ipfs.routing, 'put', sinon.fake.returns([1, 2, 3]))
      await publishRecord(key, value, b64record)
      assert(putSpy.calledOnce, 'ipfs.routing.put is called once')
    })
  })
})
