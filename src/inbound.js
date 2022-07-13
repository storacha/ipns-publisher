/* eslint-env serviceworker */
import { Router } from 'itty-router'
import { JSON404, JSON500, JSONResponse } from './utils/http/responses.js'
import { publishRecord } from './publish.js'

// We might use a different router, depending on how this is hosted
const router = Router()
router.options('*', corsOptions)
router.post('/broadcast', broadcast)
router.get('/', siteRoot)
router.all('*', () => JSON404())

/**
 * Receive a request containing an IPNS record and publish it to the DHT.
 * @returns {JSONResponse}
 */
function broadcast (request, env, ctx) {
  // TODO:
  // 1. Validate record - can we borrow code from the w3name repo? See w3name/#9
  // 2. Call publishRecord()
  // 3. Return a meaningful response
}

/**
 * Basic page for the root URL.
 * @returns Response
 */
function siteRoot () {
  return new Response(
    `
<body style="font-family: -apple-system, system-ui">
  <h1>⁂</h1>
  <p>IPNS records can be published to the /broadcast endpoint.</p>
</body>`,
    {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=UTF-8'
      }
    }
  )
}

// https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent
/** @typedef {{ waitUntil(p: Promise): void }} Ctx */

/**
 * HTTP server entrypoint. This may be changed depending on how/where we run this.
 */
export default {
  async fetch (request, env, ctx) {
    let response
    try {
      env = { ...env } // new env object for every request (it is shared otherwise)!
      response = await router.handle(request, env, ctx)
    } catch (error) {
      response = JSON500(error, request, env)
    }
    return response
  }
}
