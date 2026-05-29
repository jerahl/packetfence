// Nodes (endpoints) API. Endpoint paths mirror the existing Vue 2 app's
// src/views/Nodes/_api/index.js so the same pfappserver backend serves both.

import { api } from './client'

// Map a PF API node record into the shape the v2 views expect (matches the
// mock data structure). The actual /api/v1/nodes response is a list of
// objects with keys like mac, computername, ip4log, last_seen, status,
// category (role), device_class, etc. — fields we don't have are derived
// or left blank rather than crashing.
function normalize(n) {
  return {
    id: n.tenant_id ? `${n.tenant_id}-${n.mac}` : n.mac,
    mac: n.mac,
    hostname: n.computername || n.hostname || n.mac,
    ip: n.ip4log?.ip || n.ip || '',
    vendor: n.dhcp_vendor || n.fingerbank?.device_name || '',
    os: n.device_class || n.fingerbank?.device_class || '',
    type: n.device_type || n.fingerbank?.device_class || 'Laptop',
    role: n.category || n.role || 'default',
    vlan: n.last_vlan ?? n.vlan ?? '—',
    status: n.status || 'unregistered',
    owner: n.pid || n.owner || '—',
    lastSeen: n.last_seen || '—',
    ssid: n.last_ssid || '—',
    switch: n.last_switch || '—',
    port: n.last_port || '—',
    bandwidth: 0,
    registered: n.regdate || '—',
    events: n.security_events_count || 0,
  }
}

export const nodesApi = {
  // GET /api/v1/nodes?limit=…&cursor=…
  async list({ limit = 100, cursor } = {}) {
    const data = await api.get('nodes', { params: { limit, cursor } })
    const items = (data?.items || data || []).map(normalize)
    return { items, nextCursor: data?.nextCursor }
  },

  // POST /api/v1/nodes/search — server-side filter/sort body
  async search(body) {
    const data = await api.post('nodes/search', { body })
    return { items: (data?.items || []).map(normalize), nextCursor: data?.nextCursor }
  },

  bulkRegister(macs)   { return api.put('nodes/bulk_register',   { body: { items: macs } }) },
  bulkDeregister(macs) { return api.put('nodes/bulk_deregister', { body: { items: macs } }) },
  bulkReevaluate(macs) { return api.put('nodes/bulk_reevaluate_access', { body: { items: macs } }) },
  // Apply an isolation/quarantine security event. PF's endpoint takes
  // `items: [...mac]` plus the `security_event_id` to apply (defaults
  // to PF's built-in MANAGER isolation event when omitted; callers can
  // pass a specific id).
  bulkApplySecurityEvent(macs, securityEventId) {
    return api.put('nodes/bulk_apply_security_event', {
      body: { items: macs, security_event_id: securityEventId },
    })
  },
}
