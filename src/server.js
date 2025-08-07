/* global process */
import http from 'http'
import debug from 'debug'
import { broadcast, siteRoot } from './inbound.js'

const log = debug('ipns:server')
log.enabled = true

const port = parseInt(process.env.INBOUND_PORT || '8000', 10)
/** @type {Record<string, import('./inbound.js').InboundHandler>} */
const routes = {
  '/': siteRoot,
  '/broadcast': authorizationRequired(broadcast)
}

/**
 * "Middleware" wrapper function for protecting an endpoint function by requiring
 * that a correct 'Authorization' header is present.
 * @param {function} handler
 * @returns {import('./inbound.js').InboundHandler}
 */
function authorizationRequired (handler) {
  return (request) => {
    const authHeader = request.headers.authorization

    if (!authHeader) {
      return {
        status: 401,
        json: { message: 'Authorization header missing' }
      }
    } else if (authHeader !== process.env.AUTH_SECRET) {
      return {
        status: 403,
        json: { message: 'Authorization header invalid' }
      }
    }
    return handler(request)
  }
}

/** @type {import('./inbound.js').InboundEndpointResponse}  */
const response404 = {
  status: 404,
  json: { message: 'not found' }
}

/**
 * @param {Error} error
 * @returns {import('./inbound.js').InboundEndpointResponse}
 */
function response500 (error) {
  return {
    status: 500,
    json: { message: `Error: ${error.message}` }
  }
}

/**
 * HTTP server entrypoint. This may be changed depending on how/where we run this.
 * @type {import('http').RequestListener}
 */
async function router (request, response) {
  /** @type {import('./inbound.js').InboundEndpointResponse|undefined}  */
  let res
  try {
    const handler = routes[request.url || '']
    if (handler === undefined) {
      res = response404
    } else {
      res = await handler(request)
    }
  } catch (/** @type {any} */ error) {
    console.error(error)
    res = response500(error)
  }

  const status = ('json' in res && res.json) || ('html' in res && res.html)
    ? (res.status || 200)
    : 500

  const headers = res.headers || {}
  if ('json' in res) {
    headers['Content-Type'] = 'application/json;charset=utf8'
    response.writeHead(status, headers)
    response.end(JSON.stringify(res.json))
  } else {
    headers['Content-Type'] = 'text/html;charset=utf8'
    response.writeHead(status, headers)
    response.end(res.html)
  }
  log(`[${status}] ${request.url}`)
  if (status !== 200) log(res)
}

const server = http.createServer(router)
server.listen(port, () => {
  console.log(`Inbound server is running on http://127.0.0.1:${port}`)
})
