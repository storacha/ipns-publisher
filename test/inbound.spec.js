/* eslint-env mocha */
import assert from 'assert'
import http from 'http'
import { broadcast } from '../src/inbound.js'

describe('/broadcast endpoint', () => {
  it('should enforce required keys in JSON payload', async () => {
    const options = {
      host: '127.0.0.1',
      port: 80,
      method: 'POST',
      path: '/broadcast'
    };
    const response = await getResponse(broadcast, options, {})
    assert.equal(response.statusCode, 400)
  })
})

function getResponse(handler, requestOptions, jsonData) {
  return new Promise(async function (resolve, reject) {
    const options = {
      host: '127.0.0.1',
      port: 80,
      method: 'POST',
      path: '/broadcast',
      ...requestOptions
    };
    const request = http.ClientRequest()
    if (jsonData) {
      // TODO: add JSON.stringify(jsonData) to request body
    }
    const response = http.ServerResponse()
    await handler(request, response)
    return response
  })
}
