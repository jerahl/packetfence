// Minimal fetch wrapper for PacketFence's /api/v1/* endpoints.
//
// Same-origin assumption: the v2 app is served under /admin/v2/ behind the
// same reverse proxy as /api/*, so the browser's session cookie rides along
// automatically. In dev, vite.config.js proxies /api → the pfappserver
// instance configured by VITE_API_HOST.
//
// Errors throw an ApiError so composables can render a usable message
// and (optionally) fall back to mock data.

const BASE = '/api/v1/'

export class ApiError extends Error {
  constructor(status, body, message) {
    super(message || `API ${status}`)
    this.status = status
    this.body = body
  }
}

async function request(method, path, { params, body, signal } = {}) {
  const url = new URL(BASE + path.replace(/^\//, ''), window.location.origin)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, v)
    }
  }
  let res
  try {
    res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (e) {
    // Network error (DNS, refused, offline) — surface as 0 so callers can
    // distinguish from "server responded with an error".
    throw new ApiError(0, null, e.message || 'Network error')
  }
  let data = null
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    try { data = await res.json() } catch { /* ignore parse error on empty body */ }
  }
  if (!res.ok) throw new ApiError(res.status, data, data?.message || res.statusText)
  return data
}

export const api = {
  get:    (path, opts) => request('GET',    path, opts),
  post:   (path, opts) => request('POST',   path, opts),
  put:    (path, opts) => request('PUT',    path, opts),
  delete: (path, opts) => request('DELETE', path, opts),
}
