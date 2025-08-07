/**
 * Utility to get the body from a request.
 * @param {import('http').IncomingMessage} request
 * @returns {Promise<string>}
 */
export function getBody (request) {
  const promise = new Promise((resolve, reject) => {
    /** @type {Uint8Array[]} */
    const body = []
    request.on('data', (chunk) => {
      body.push(chunk)
    }).on('error', err => {
      reject(err)
    }).on('end', () => {
      resolve(Buffer.concat(body).toString())
    })
  })
  return promise
}
