// Thin wrapper over Netdata's /api/v1/data endpoint, reached through PF's
// reverse proxy at /netdata/<ip>/. The same Bearer token that authorises
// /api/v1/* authorises these calls (see api/auth.js).
//
// NetdataChart.vue does its own fetch for the chart SVGs; this module is for
// the KPI-style "latest value" reads the Status pages put above the charts.
// Keeping it here (rather than inline in the view) means the Services and
// Local Queue pages can reuse the same snapshot helpers when they land.

import { authHeader } from './auth'

export const DEFAULT_HOST = '/netdata/127.0.0.1'

// Fetch a chart's data window. Returns the raw Netdata response
// ({ labels, data, units, ... }) or throws on a non-2xx / network error so
// useResource's `fallback` can take over.
export async function fetchData(metric, {
  host = DEFAULT_HOST,
  after = -60,
  points = 2,
  dimensions,
  options = 'flip',
} = {}) {
  const url = new URL(`${host}/api/v1/data`, window.location.origin)
  url.searchParams.set('chart', metric)
  url.searchParams.set('after', String(after))
  url.searchParams.set('points', String(points))
  url.searchParams.set('format', 'json')
  // `flip` returns oldest-first so the freshest sample is the last row —
  // matches the ordering NetdataChart renders with.
  if (options) url.searchParams.set('options', options)
  if (dimensions) url.searchParams.set('dimensions', dimensions)

  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...authHeader() },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Reduce a chart to its most-recent sample. Returns:
//   { ts, units, dims: { <name>: value }, total, inbound, outbound }
// inbound/outbound split the dimensions by sign — Netdata reports "out"
// directions (sent, transmitted) as negative on its bandwidth/packet
// charts, so the magnitude of the negatives is the outbound figure.
export async function latest(metric, opts = {}) {
  const d = await fetchData(metric, opts)
  const empty = { ts: null, units: '', dims: {}, total: 0, inbound: 0, outbound: 0 }
  if (!d?.labels || !Array.isArray(d.data) || d.data.length === 0) return empty

  const names = d.labels.slice(1)
  const row = d.data[d.data.length - 1]   // freshest sample (options=flip)
  if (!Array.isArray(row)) return empty

  const dims = {}
  let total = 0, inbound = 0, outbound = 0
  for (let i = 0; i < names.length; i++) {
    const v = row[i + 1]
    if (typeof v !== 'number' || !Number.isFinite(v)) continue
    dims[names[i]] = v
    total += Math.abs(v)
    if (v >= 0) inbound += v
    else outbound += -v
  }
  return { ts: row[0], units: d.units || '', dims, total, inbound, outbound }
}
