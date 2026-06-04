<script setup>
// Status > Network Communication — Fingerbank device <-> host <-> protocol
// flows. Ports the v1 /admin/status/network_communication page: it pulls
// POST /api/v1/nodes/fingerbank_communications for a set of endpoints and
// lets you explore which devices talk to which hosts over which protocols.
//
// Same four views as v1 (Flows / Hosts / Protocols / Data) plus a filter
// bar (device, protocol, host) that narrows every view in lockstep. The
// Flows view is a pure-SVG parallel diagram (Device | Host | Protocol),
// keeping with the app's no-D3 approach. Degrades to mock fingerbank data
// via useResource's fallback when the backend isn't reachable.
import { computed, ref } from 'vue'
import { nodesApi } from '@/api/nodes'
import { communicationApi, toFlows, protoColor } from '@/api/communication'
import { useResource } from '@/composables/useResource'
import { MOCK_COMMUNICATION, NAC_DATA } from '@/data/mock'
import Icon from '@/components/Icon.vue'
import Donut from '@/components/ui/Donut.vue'

const TABS = ['Flows', 'Hosts', 'Protocols', 'Data']
const tab = ref('Flows')

// --- Filters (narrow all views together, like the v1 filter tabs) ---
const selectedDevices = ref(new Set())     // by mac
const selectedProtos = ref(new Set())      // by proto family: TCP/UDP/UNKNOWN
const hostQuery = ref('')

// --- Data ----------------------------------------------------------
// Fetch communications for a sample of the live endpoints; fall back to the
// bundled mock response shape when nodes or the fingerbank call fail.
const { data: raw, loading, refresh } = useResource(async () => {
  const { items } = await nodesApi.list({ limit: 50 })
  const macs = (items || []).map(n => n.mac).filter(Boolean)
  const data = await communicationApi.fingerbankCommunications(macs)
  // Empty object = nothing to show; surface the mock instead of a blank page.
  return (data && Object.keys(data).length) ? data : MOCK_COMMUNICATION
}, { fallback: MOCK_COMMUNICATION })

const allFlows = computed(() => toFlows(raw.value))

// mac -> mock node (for nicer device labels when running on mock data)
const nodeByMac = computed(() => {
  const m = new Map()
  for (const n of NAC_DATA.nodes) m.set(n.mac.toLowerCase(), n)
  return m
})
function deviceLabel(mac) {
  const n = nodeByMac.value.get(mac)
  return n ? n.hostname : mac
}

const hasFilters = computed(() =>
  hostQuery.value.trim() !== '' || selectedDevices.value.size > 0 || selectedProtos.value.size > 0)

const flows = computed(() => {
  let list = allFlows.value
  if (selectedDevices.value.size) list = list.filter(f => selectedDevices.value.has(f.mac))
  if (selectedProtos.value.size) list = list.filter(f => selectedProtos.value.has(f.proto))
  const q = hostQuery.value.trim().toLowerCase()
  if (q) list = list.filter(f => f.host.includes(q) || f.protocol.toLowerCase().includes(q) || f.mac.includes(q))
  return list
})

// --- Rollups (from the filtered flows) ------------------------------
function rollup(keyFn) {
  const m = new Map()
  for (const f of flows.value) {
    const k = keyFn(f)
    m.set(k, (m.get(k) || 0) + f.count)
  }
  return [...m.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count)
}
const byDevice = computed(() => rollup(f => f.mac))
const byHost = computed(() => {
  const m = new Map()
  for (const f of flows.value) {
    const cur = m.get(f.host) || { count: 0, internal: f.internal, protos: {} }
    cur.count += f.count
    cur.protos[f.proto] = (cur.protos[f.proto] || 0) + f.count
    m.set(f.host, cur)
  }
  return [...m.entries()].map(([host, v]) => ({ host, ...v })).sort((a, b) => b.count - a.count)
})
const byProtocol = computed(() => rollup(f => f.protocol))
const totalCount = computed(() => flows.value.reduce((s, f) => s + f.count, 0))

// Filter option sets (from all flows so options don't vanish as you filter)
const allDevices = computed(() => {
  const m = new Map()
  for (const f of allFlows.value) m.set(f.mac, (m.get(f.mac) || 0) + f.count)
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([mac]) => mac)
})
const allProtoFamilies = computed(() => {
  const s = new Set()
  for (const f of allFlows.value) s.add(f.proto)
  return [...s].sort()
})

// --- Protocol donut -------------------------------------------------
const PALETTE = [
  'oklch(0.72 0.16 250)', 'oklch(0.74 0.16 150)', 'oklch(0.80 0.15 78)',
  'oklch(0.68 0.20 25)', 'oklch(0.72 0.13 290)', 'oklch(0.70 0.14 200)',
  'oklch(0.75 0.14 350)', 'oklch(0.78 0.10 100)',
]
const protocolDonut = computed(() =>
  byProtocol.value.slice(0, 8).map((r, i) => ({ name: r.key, v: r.count, color: PALETTE[i % PALETTE.length] })))

// --- Flows parallel diagram ----------------------------------------
// Three axes: top-N devices | hosts | protocols. One polyline per flow
// (capped for legibility), coloured by protocol family, width by count.
const flowChart = computed(() => {
  const topDevices = byDevice.value.slice(0, 10).map(d => d.key)
  const topHosts = byHost.value.slice(0, 12).map(h => h.host)
  const topProtos = byProtocol.value.slice(0, 10).map(p => p.key)
  const dSet = new Set(topDevices), hSet = new Set(topHosts), pSet = new Set(topProtos)

  const rows = Math.max(topDevices.length, topHosts.length, topProtos.length, 1)
  const W = 900
  const rowH = 26, padT = 14, padB = 14
  const H = padT + padB + rows * rowH
  const colX = { device: 168, host: W / 2, proto: W - 168 }

  const yOf = (arr) => {
    const map = new Map()
    const n = arr.length
    arr.forEach((k, i) => {
      // centre each column's nodes vertically within the chart
      const span = (H - padT - padB)
      const y = n === 1 ? padT + span / 2 : padT + (span * i) / (n - 1)
      map.set(k, y)
    })
    return map
  }
  const dy = yOf(topDevices), hy = yOf(topHosts), py = yOf(topProtos)

  const drawn = flows.value
    .filter(f => dSet.has(f.mac) && hSet.has(f.host) && pSet.has(f.protocol))
    .sort((a, b) => b.count - a.count)
    .slice(0, 150)
  const maxCount = drawn.reduce((m, f) => Math.max(m, f.count), 1)

  const links = drawn.map(f => ({
    d: `M${colX.device},${dy.get(f.mac).toFixed(1)} L${colX.host},${hy.get(f.host).toFixed(1)} L${colX.proto},${py.get(f.protocol).toFixed(1)}`,
    color: protoColor(f.proto),
    width: 1 + (f.count / maxCount) * 5,
  }))

  const mk = (arr, ymap, x, anchor) => arr.map(k => ({ key: k, y: ymap.get(k), x, anchor }))
  return {
    W, H, colX,
    links,
    devices: mk(topDevices, dy, colX.device, 'end'),
    hosts: mk(topHosts, hy, colX.host, 'middle'),
    protos: mk(topProtos, py, colX.proto, 'start'),
  }
})

function truncate(s, n = 30) {
  s = String(s)
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

// --- Filter actions -------------------------------------------------
function toggle(set, val) {
  const next = new Set(set.value)
  next.has(val) ? next.delete(val) : next.add(val)
  set.value = next
}
function clearFilters() {
  hostQuery.value = ''
  selectedDevices.value = new Set()
  selectedProtos.value = new Set()
}
</script>

<template>
  <div class="page" style="max-width: 1480px">
    <div class="page-head">
      <div>
        <div class="page-title">Network Communication</div>
        <div class="page-sub">
          Fingerbank device · host · protocol flows from
          <span class="mono">/api/v1/nodes/fingerbank_communications</span>
          <span v-if="loading" style="color:var(--text-faint); margin-left:8px">loading…</span>
        </div>
      </div>
      <div class="page-tools">
        <button class="btn" @click="refresh"><Icon name="refresh" :size="13" /> Refresh</button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label"><Icon name="endpoints" :size="12" /> Devices</div>
        <div class="kpi-value num">{{ byDevice.length.toLocaleString() }}</div>
        <div class="kpi-delta">communicating endpoints</div>
      </div>
      <div class="kpi">
        <div class="kpi-label"><Icon name="globe" :size="12" /> Hosts</div>
        <div class="kpi-value num">{{ byHost.length.toLocaleString() }}</div>
        <div class="kpi-delta">distinct destinations</div>
      </div>
      <div class="kpi">
        <div class="kpi-label"><Icon name="signal" :size="12" /> Protocols</div>
        <div class="kpi-value num">{{ byProtocol.length.toLocaleString() }}</div>
        <div class="kpi-delta">proto:port pairs</div>
      </div>
      <div class="kpi">
        <div class="kpi-label"><Icon name="bolt" :size="12" /> Flows</div>
        <div class="kpi-value num">{{ totalCount.toLocaleString() }}</div>
        <div class="kpi-delta">{{ flows.length.toLocaleString() }} edges observed</div>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="card comm-filters">
      <div class="comm-filter-row">
        <div class="tbl-search" style="flex:1; max-width:380px">
          <Icon name="search" />
          <input v-model="hostQuery" placeholder="Filter by host, protocol or MAC…" />
          <button v-if="hostQuery" class="btn sm ghost" @click="hostQuery = ''" title="Clear"><Icon name="x" :size="12" /></button>
        </div>
        <div class="comm-chips">
          <span class="comm-chip-label">Protocol</span>
          <button v-for="p in allProtoFamilies" :key="p" type="button"
                  :class="['chip', selectedProtos.has(p) ? 'accent' : '']" style="cursor:pointer"
                  @click="toggle(selectedProtos, p)">
            <span class="proto-dot" :style="{ background: protoColor(p) }"></span>{{ p }}
          </button>
        </div>
        <button v-if="hasFilters" class="btn sm ghost" style="margin-left:auto" @click="clearFilters">
          <Icon name="x" :size="12" /> Clear filters
        </button>
      </div>
      <div class="comm-filter-row comm-devices-row">
        <span class="comm-chip-label">Devices</span>
        <button v-for="mac in allDevices" :key="mac" type="button"
                :class="['chip', selectedDevices.has(mac) ? 'accent' : '']" style="cursor:pointer"
                :title="mac" @click="toggle(selectedDevices, mac)">
          {{ truncate(deviceLabel(mac), 22) }}
        </button>
        <div v-if="allDevices.length === 0" style="color:var(--text-faint); font-size:11px">No communication data.</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <div v-for="t in TABS" :key="t" :class="['t', { active: tab === t }]" @click="tab = t">{{ t }}</div>
    </div>

    <!-- Flows -->
    <div v-if="tab === 'Flows'" class="card">
      <div class="card-head">
        <div>
          <div class="card-title">Flows</div>
          <div class="card-sub">Device → Host → Protocol · top paths · coloured by protocol</div>
        </div>
        <div class="flow-legend">
          <span v-for="p in allProtoFamilies" :key="p" class="flow-leg">
            <span class="proto-dot" :style="{ background: protoColor(p) }"></span>{{ p }}
          </span>
        </div>
      </div>
      <div class="card-body">
        <svg v-if="flowChart.links.length" :viewBox="`0 0 ${flowChart.W} ${flowChart.H}`" style="width:100%; display:block">
          <text :x="flowChart.colX.device" :y="10" text-anchor="end" class="axis-cap">DEVICE</text>
          <text :x="flowChart.colX.host" :y="10" text-anchor="middle" class="axis-cap">HOST</text>
          <text :x="flowChart.colX.proto" :y="10" text-anchor="start" class="axis-cap">PROTOCOL</text>
          <path v-for="(l, i) in flowChart.links" :key="i" :d="l.d" fill="none"
                :stroke="l.color" :stroke-width="l.width" stroke-opacity="0.4" />
          <g>
            <g v-for="d in flowChart.devices" :key="'d'+d.key">
              <circle :cx="d.x" :cy="d.y" r="3" fill="var(--text-dim)" />
              <text :x="d.x - 8" :y="d.y + 3" text-anchor="end" class="axis-node">{{ truncate(deviceLabel(d.key), 22) }}</text>
            </g>
            <g v-for="h in flowChart.hosts" :key="'h'+h.key">
              <circle :cx="h.x" :cy="h.y" r="3" fill="var(--text)" />
              <text :x="h.x" :y="h.y - 6" text-anchor="middle" class="axis-node">{{ truncate(h.key, 28) }}</text>
            </g>
            <g v-for="p in flowChart.protos" :key="'p'+p.key">
              <circle :cx="p.x" :cy="p.y" r="3" :fill="protoColor(p.key.split(':')[0])" />
              <text :x="p.x + 8" :y="p.y + 3" text-anchor="start" class="axis-node mono">{{ p.key }}</text>
            </g>
          </g>
        </svg>
        <div v-else class="empty" style="text-align:center; padding:40px">No flows match the current filters.</div>
      </div>
    </div>

    <!-- Hosts -->
    <div v-else-if="tab === 'Hosts'" class="card">
      <div class="card-head">
        <div class="card-title">Hosts</div>
        <div class="card-sub">{{ byHost.length }} destinations · scope reflects filters</div>
      </div>
      <div class="card-body bar-list">
        <div v-for="h in byHost.slice(0, 25)" :key="h.host" class="bar-row">
          <span class="bar-name" :title="h.host">
            <span :class="['chip', h.internal ? 'ok' : 'info']" style="margin-right:6px">{{ h.internal ? 'internal' : 'external' }}</span>
            {{ h.host }}
          </span>
          <div class="bar-track">
            <span :style="{ width: (byHost[0]?.count ? h.count / byHost[0].count * 100 : 0) + '%', background: 'var(--accent)' }" />
          </div>
          <span class="mono bar-count">{{ h.count.toLocaleString() }}</span>
        </div>
        <div v-if="byHost.length === 0" class="empty">No hosts.</div>
      </div>
    </div>

    <!-- Protocols -->
    <div v-else-if="tab === 'Protocols'" class="card">
      <div class="card-head">
        <div class="card-title">Protocols</div>
        <div class="card-sub">{{ byProtocol.length }} proto:port pairs</div>
      </div>
      <div class="card-body" style="display:flex; gap:18px; align-items:center; flex-wrap:wrap">
        <Donut :data="protocolDonut" :size="150" />
        <div class="donut-legend" style="flex:1; min-width:280px">
          <div v-for="(r, i) in byProtocol.slice(0, 8)" :key="r.key" class="lg-row">
            <span class="sw" :style="{ background: PALETTE[i % PALETTE.length] }" />
            <span class="lg-name mono">{{ r.key }}</span>
            <span class="lg-val">{{ r.count.toLocaleString() }}</span>
            <span class="lg-pct">{{ totalCount ? Math.round(r.count / totalCount * 100) : 0 }}%</span>
          </div>
          <div v-if="byProtocol.length === 0" class="empty">No protocols.</div>
        </div>
      </div>
    </div>

    <!-- Data -->
    <div v-else class="tbl-wrap">
      <div class="tbl-toolbar">
        <span style="font-size:12px; color:var(--text-dim)">
          <b class="num">{{ flows.length.toLocaleString() }}</b> flow{{ flows.length === 1 ? '' : 's' }}
          <template v-if="hasFilters">(filtered)</template>
        </span>
      </div>
      <table class="tbl">
        <thead>
          <tr><th>Device</th><th>Host</th><th>Protocol</th><th class="num" style="text-align:right">Count</th></tr>
        </thead>
        <tbody>
          <tr v-for="(f, i) in flows.slice(0, 300)" :key="i">
            <td><span class="mono">{{ f.mac }}</span>
              <span v-if="deviceLabel(f.mac) !== f.mac" style="color:var(--text-dim)"> · {{ deviceLabel(f.mac) }}</span>
            </td>
            <td>
              <span :class="['chip', f.internal ? 'ok' : 'info']" style="margin-right:6px">{{ f.internal ? 'int' : 'ext' }}</span>
              {{ f.host }}
            </td>
            <td><span class="chip" :style="{ borderColor: protoColor(f.proto), color: protoColor(f.proto) }">{{ f.protocol }}</span></td>
            <td class="mono" style="text-align:right">{{ f.count.toLocaleString() }}</td>
          </tr>
          <tr v-if="flows.length === 0"><td colspan="4" class="empty" style="text-align:center">No flows match the current filters.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.proto-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 5px; vertical-align: middle; }

.comm-filters { margin-bottom: 14px; padding: 10px 12px; }
.comm-filter-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.comm-filter-row + .comm-filter-row { margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border); }
.comm-chip-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-faint); font-weight: 600; margin-right: 2px; }
.comm-chips { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.comm-filter-row .chip { cursor: pointer; }
.comm-filter-row .chip:hover { background: var(--bg-hover); color: var(--text); }

.tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--border); margin-bottom: 14px; flex-wrap: nowrap; overflow-x: auto; }
.tabs .t { padding: 9px 14px; font-size: 13px; font-weight: 500; color: var(--text-dim); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap; }
.tabs .t:hover { color: var(--text); }
.tabs .t.active { color: var(--text); border-color: var(--accent); }

.flow-legend { display: flex; gap: 12px; font-size: 11px; color: var(--text-dim); }
.flow-leg { display: inline-flex; align-items: center; }
.axis-cap { font-size: 9px; letter-spacing: 0.1em; fill: var(--text-faint); font-family: var(--font-mono); }
.axis-node { font-size: 10px; fill: var(--text-mid); }

.bar-list { display: flex; flex-direction: column; }
.bar-row { display: grid; grid-template-columns: 360px 1fr 64px; align-items: center; gap: 10px; padding: 7px 0; }
.bar-row:not(:last-child) { border-bottom: 1px solid var(--border); }
.bar-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px; }
.bar-track { height: 6px; background: var(--bg-elev-2); border-radius: 3px; overflow: hidden; }
.bar-track > span { display: block; height: 100%; }
.bar-count { text-align: right; color: var(--text-dim); font-size: 11px; }
</style>
