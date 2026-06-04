// Fingerbank "network communication" data — powers Status > Network
// Communication. Ports the data model from the v1 page's useCommunication
// composable (html/pfappserver/.../Status/network_communication).
//
// The backend endpoint is POST /api/v1/nodes/fingerbank_communications with
// { nodes: [<mac-without-separators>] }. It returns, per device:
//   { <devicehex>: { all_hosts_cache: { <host>: { "<PROTO:PORT>": count } } } }
// `toFlows` flattens that into a tabular list the views narrow and chart.

import { api } from './client'

// Protocol colours mirror the v1 config.js semantics (TCP green, UDP blue,
// UNKNOWN red), re-expressed as the v2 palette's oklch tokens.
export const PROTO_COLORS = {
  TCP: 'oklch(0.74 0.16 150)',
  UDP: 'oklch(0.72 0.16 250)',
  UNKNOWN: 'oklch(0.68 0.20 25)',
}
export function protoColor(proto) {
  return PROTO_COLORS[proto] || 'oklch(0.70 0.13 290)'
}

// 12 hex chars -> aa:bb:cc:dd:ee:ff
export function decorateMac(hex) {
  const m = String(hex).replace(/[^0-9a-f]/gi, '').toLowerCase().match(/.{1,2}/g)
  return m ? m.join(':') : String(hex)
}

// PF stores the protocol key as "PROTO:PORT" (e.g. "TCP:443"); early agents
// emitted a bare port with no proto, which we treat as UNKNOWN.
export function splitProtocol(p) {
  const [port, proto = 'UNKNOWN'] = String(p).split(':').reverse()
  return { proto: (proto || 'UNKNOWN').toUpperCase(), port }
}
export function decorateProtocol(p) {
  const { proto, port } = splitProtocol(p)
  return `${proto}:${port}`
}

// host may carry a :port suffix; an internal host is an IP or under PF's
// own domain. We don't have the domain client-side, so flag IPs/private
// ranges and *.local / *.lan / *.corp as internal for grouping/sorting.
export function isInternalHost(host) {
  const h = String(host).toLowerCase().split(':')[0]
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return true
  if (/(\.local|\.lan|\.corp|\.internal)$/.test(h)) return true
  if (!h.includes('.')) return true
  return false
}

// Flatten the raw fingerbank_communications response into flow rows.
export function toFlows(raw) {
  const flows = []
  for (const [device, value] of Object.entries(raw || {})) {
    const cache = (value && value.all_hosts_cache) || {}
    const mac = decorateMac(device)
    for (const [rawHost, protos] of Object.entries(cache)) {
      const host = String(rawHost).toLowerCase()
      if (!host) continue
      for (const [rawProto, count] of Object.entries(protos || {})) {
        const { proto, port } = splitProtocol(rawProto)
        flows.push({
          device, mac, host,
          proto, port,
          protocol: `${proto}:${port}`,
          internal: isInternalHost(host),
          count: Number(count) || 0,
        })
      }
    }
  }
  return flows
}

export const communicationApi = {
  // POST /api/v1/nodes/fingerbank_communications
  async fingerbankCommunications(macs) {
    const nodes = (macs || []).map(m => String(m).replace(/[^0-9A-Fa-f]/g, ''))
    if (!nodes.length) return {}
    const data = await api.post('nodes/fingerbank_communications', { body: { nodes } })
    return data || {}
  },
}
