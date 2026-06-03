// Bridge the v2 app to PF's existing authentication. The Vue 2 admin
// stores the JWT under localStorage['user-token'] (see
// html/pfappserver/root/src/store/modules/session.js#STORAGE_TOKEN_KEY)
// and attaches it as `Authorization: Bearer <jwt>` on every /api/v1/*
// call. Caddy's api-aaa middleware accepts that header on every
// /api/v1/* path — including /api/v1/monitoring/* (Netdata) which is
// what /netdata/<ip>/* gets rewritten to inside HAProxy.
//
// Until the v2 app has its own login flow, we read the same token
// the existing admin wrote. Same origin → same localStorage.

const TOKEN_KEY = 'user-token'

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' }
}

export function authHeader() {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}
