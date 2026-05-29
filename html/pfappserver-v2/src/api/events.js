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
}
