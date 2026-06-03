// Security events API. PF's endpoint is /api/v1/security_events — open
// events for the dashboard "Open security events" panel and the inspector's
// Events tab.

import { api } from './client'

function severityFromPriority(p) {
  if (p === undefined || p === null) return 'low'
  // PF priorities: lower is more severe. Bucket into the four tiers the
  // UI uses (critical/high/medium/low).
  if (p <= 1) return 'critical'
  if (p <= 3) return 'high'
  if (p <= 6) return 'medium'
  return 'low'
}

function normalize(e) {
  return {
    id: e.id || e.security_event_id || `E-${e.start_date || ''}`,
    rule: e.description || e.security_event || 'Security event',
    severity: severityFromPriority(e.priority),
    action: e.action || '—',
    time: e.start_date || '—',
    desc: e.notes || e.descriptionLong || '',
    // Keep the same `.node` shape the mock uses so views don't branch.
    // Only the MAC is populated from this endpoint; opening the inspector
    // can fetch the full record on demand if needed.
    node: { mac: e.mac, id: e.mac, hostname: e.computername || e.mac },
  }
}

export const eventsApi = {
  // GET /api/v1/security_events?status=open&limit=…
  async listOpen({ limit = 25 } = {}) {
    const data = await api.get('security_events', { params: { status: 'open', limit } })
    return (data?.items || []).map(normalize)
  },

  async listForNode(mac, { limit = 25 } = {}) {
    const data = await api.get('security_events', { params: { mac, limit } })
    return (data?.items || []).map(normalize)
  },

  // POST /api/v1/security_events/search — server-side filter / sort body.
  // Same endpoint the v1 Threats page used.
  async search(body) {
    const data = await api.post('security_events/search', { body })
    return { items: (data?.items || []).map(normalize), nextCursor: data?.nextCursor }
  },

  // KPI counters — each returns `{ count }` on the v1 endpoints.
  async totals() {
    const [open, closed, pending] = await Promise.all([
      api.get('security_events/total_open').catch(() => ({ count: 0 })),
      api.get('security_events/total_closed').catch(() => ({ count: 0 })),
      api.get('security_events/total_pending').catch(() => ({ count: 0 })),
    ])
    return {
      open: open?.count ?? open?.total ?? 0,
      closed: closed?.count ?? closed?.total ?? 0,
      pending: pending?.count ?? pending?.total ?? 0,
    }
  },

  // Per-rule (security_event_id) counts, scoped to a status.
  // Response shape: { items: [{ security_event_id, count }, ...] }
  async perRule(status = 'open') {
    const data = await api.get(`security_events/per_security_event_id_${status}`)
    return data?.items || []
  },

  // Per-device-class counts: { items: [{ device_class, count }, ...] }
  async perDeviceClass(status = 'open') {
    const data = await api.get(`security_events/per_device_class_${status}`)
    return data?.items || []
  },

  // Close an open event: PUT /api/v1/node/<mac>/close_security_event
  // taking the security_event_id of the open record to release.
  release(mac, id) {
    return api.put(`node/${encodeURIComponent(mac)}/close_security_event`, {
      body: { security_event_id: id },
    })
  },
}
