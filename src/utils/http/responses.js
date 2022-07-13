/* eslint-env serviceworker */

export class JSONResponse extends Response {
  /**
   * @param {any} body
   * @param {ResponseInit} [init]
   */
  constructor(body, init = {}) {
    init.headers = init.headers || {}
    init.headers['Content-Type'] = 'application/json;charset=UTF-8'
    super(JSON.stringify(body), init)
  }
}

export function JSON404(message = 'Not Found') {
  return new JSONResponse({ message }, { status: 404 })
}

/**
 * Return a JSON-type HTTP response with info about the given error.
 * @param {Error & {status?: number;code?: string;reason?: string; details?: string; }} err
 * @param {import('./env').Env} env
 * @returns {JSONResponse}
 */
export function JSON500(err, { log }) {
  console.error(err.stack)

  let status = err.status || 500
  if (status >= 500) {
    log.error(err)
  }

  let error = {
    code: err.code,
    message: err.message
  }

  return new JSONResponse(error, { status })
}
