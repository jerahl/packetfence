<script setup>
// Status > Assets — inventory dashboard based on /admin/status/assets.
//
// The v1 page is a force-directed network graph of nodes + links (data:
// POST /api/v1/nodes/network_graph). Porting that visualisation needs
// a real graph layout engine and is a separate piece of work; what
// this page does instead is surface the same underlying inventory
// data — device-class breakdown (GET /api/v1/nodes/per_device_class),
// plus vendor/OS/status rollups derived client-side from the nodes
// list — in a dense ops-console layout consistent with the rest of v2.
import { computed, ref } from 'vue'
import { useUiStore } from '@/stores/ui'
import { NAC_DATA, deviceIcon } from '@/data/mock'
import { nodesApi } from '@/api/nodes'
import { useResource } from '@/composables/useResource'
import Icon from '@/components/Icon.vue'
import Donut from '@/components/ui/Donut.vue'
import StatusChip from '@/components/ui/StatusChip.vue'
import NodeGraph from '@/components/ui/NodeGraph.vue'

const ui = useUiStore()

// --- Filters --------------------------------------------------------
// Mirror of the v1 Assets page's filters: a free-text search across
// the obvious node fields (hostname/mac/owner/ip/vendor), a device-
// class chip multi-select (the prominent grid in v1's footer), and
// a status chip multi-select for completeness.
//
// Filters narrow the entire page in sync: KPIs, donut, vendor/OS
// rollups, status bars, the recent table, AND the topology graph
// (endpoints that don't match are dropped along with their edges;
// PF + switches stay so the topology reads as "what's left").
const STATUSES = ['registered', 'pending', 'unregistered', 'isolated']
const q = ref('')
const selectedClasses = ref(new Set())   // device class names
const selectedStatuses = ref(new Set())  // status values

// Donut palette (oklch slots so it tracks the active theme/accent).
const PALETTE = [
  'oklch(0.72 0.16 250)',
  'oklch(0.74 0.16 150)',
  'oklch(0.80 0.15 78)',
  'oklch(0.68 0.20 25)',
  'oklch(0.72 0.13 290)',
  'oklch(0.70 0.14 200)',
  'oklch(0.75 0.14 350)',
  'oklch(0.78 0.10 100)',
  'oklch(0.65 0.12 30)',
  'oklch(0.68 0.10 180)',
]

// Live device-class breakdown; falls back to deriving it from the mock
// nodes so the view still renders end-to-end without a backend.
const mockPerClass = NAC_DATA.nodes.reduce((acc, n) => {
  const k = n.type || 'Unknown'
  acc[k] = (acc[k] || 0) + 1
  return acc
}, {})
const mockPerClassItems = Object.entries(mockPerClass).map(([device_class, count]) => ({ device_class, count }))

const { data: perClass, loading: perClassLoading } = useResource(
  () => nodesApi.perDeviceClass(),
  { fallback: mockPerClassItems },
)

// Pull the same nodes list the Endpoints page uses; vendor/OS/status
// rollups are derived client-side. Keeping it to a generous cap so
// derivations are representative without hammering the API.
const { data: nodes, loading: nodesLoading } = useResource(
  () => nodesApi.list({ limit: 1000 }).then(r => r.items),
  { fallback: NAC_DATA.nodes },
)

// Live network topology — falls back to the derived mock graph
// (PF → switches → endpoints) when the API is unreachable.
const { data: graph, loading: graphLoading } = useResource(
  () => nodesApi.networkGraph(),
  { fallback: NAC_DATA.networkGraph },
)

const loading = computed(() => perClassLoading.value || nodesLoading.value || graphLoading.value)

const hasFilters = computed(() =>
  q.value.trim() !== '' || selectedClasses.value.size > 0 || selectedStatuses.value.size > 0,
)

// Filtered nodes — driver for every rollup, the donut, and the
// recent table. Always present; equals `nodes` when no filter active.
const filteredNodes = computed(() => {
  const list = nodes.value || []
  const ql = q.value.trim().toLowerCase()
  const classes = selectedClasses.value
  const statuses = selectedStatuses.value
  if (!ql && classes.size === 0 && statuses.size === 0) return list
  return list.filter(n => {
    if (ql) {
      const hay = `${n.hostname || ''} ${n.mac || ''} ${n.owner || ''} ${n.ip || ''} ${n.vendor || ''} ${n.os || ''}`.toLowerCase()
      if (!hay.includes(ql)) return false
    }
    if (classes.size && !classes.has(n.type || '—')) return false
    if (statuses.size && !statuses.has(n.status)) return false
    return true
  })
})

// All device classes we know about, ranked. Pulls from the API's
// per-device-class counts when no filter is active (those reflect
// the full DB, beyond the 1000-node `list` cap); falls back to a
// derivation from the loaded nodes otherwise. Used both for the
// donut and for the chip set rendered in the filter bar.
function deriveClassRows(list) {
  const acc = new Map()
  for (const n of list) {
    const k = n.type || 'Unknown'
    acc.set(k, (acc.get(k) || 0) + 1)
  }
  return [...acc.entries()]
    .map(([device_class, count]) => ({ device_class, count }))
    .sort((a, b) => b.count - a.count)
}
const classRows = computed(() => {
  const source = hasFilters.value
    ? deriveClassRows(filteredNodes.value)
    : ((perClass.value && perClass.value.length)
        ? perClass.value.slice().sort((a, b) => b.count - a.count)
        : deriveClassRows(nodes.value || []))
  return source.map((r, i) => ({ ...r, color: PALETTE[i % PALETTE.length] }))
})

// Full unfiltered class list for the filter chip set — independent
// of the active filter so the chips stay stable as users toggle.
const allClasses = computed(() => {
  if (perClass.value && perClass.value.length) {
    return perClass.value.slice().sort((a, b) => b.count - a.count).map(r => r.device_class)
  }
  return deriveClassRows(nodes.value || []).map(r => r.device_class)
})

const totalAssets = computed(() => classRows.value.reduce((s, r) => s + r.count, 0))
const totalUnfiltered = computed(() => {
  if (perClass.value && perClass.value.length) return perClass.value.reduce((s, r) => s + r.count, 0)
  return (nodes.value || []).length
})
const topClass = computed(() => classRows.value[0])
const classCount = computed(() => classRows.value.length)

const donutData = computed(() => classRows.value.slice(0, 8).map(r => ({ name: r.device_class, v: r.count, color: r.color })))

// Group nodes by a key and emit the top N with counts. Stable sort so
// equal counts preserve insertion order for a deterministic UI.
function topBy(list, key, n = 10) {
  const acc = new Map()
  for (const item of list) {
    const k = item[key] || '—'
    acc.set(k, (acc.get(k) || 0) + 1)
  }
  return [...acc.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

const topVendors = computed(() => topBy(filteredNodes.value, 'vendor', 8))
const topOses    = computed(() => topBy(filteredNodes.value, 'os',     8))

const statusBreakdown = computed(() => {
  const order = STATUSES
  const acc = new Map(order.map(k => [k, 0]))
  for (const n of filteredNodes.value) {
    acc.set(n.status, (acc.get(n.status) || 0) + 1)
  }
  return order.map(k => ({ status: k, count: acc.get(k) || 0 }))
})

const activePct = computed(() => {
  const total = filteredNodes.value.length || 1
  const reg = statusBreakdown.value.find(s => s.status === 'registered')?.count || 0
  return Math.round(reg / total * 100)
})

const recent = computed(() => filteredNodes.value.slice(0, 8))

function pct(count) {
  return totalAssets.value ? Math.round(count / totalAssets.value * 100) : 0
}

// Filtered graph — keep PF + switches; filter endpoint nodes by which
// MACs are present in filteredNodes; drop links whose target endpoint
// got filtered. When no filter is active, return the source graph
// untouched (no allocations).
const filteredGraph = computed(() => {
  if (!graph.value) return { nodes: [], links: [] }
  if (!hasFilters.value) return graph.value
  const keepMacs = new Set(filteredNodes.value.map(n => n.mac))
  const keptIds = new Set()
  const nextNodes = []
  for (const gn of graph.value.nodes) {
    if (gn.type !== 'node') { nextNodes.push(gn); keptIds.add(gn.id); continue }
    if (gn.mac && keepMacs.has(gn.mac)) { nextNodes.push(gn); keptIds.add(gn.id) }
  }
  const nextLinks = graph.value.links.filter(l => keptIds.has(l.source) && keptIds.has(l.target))
  return { nodes: nextNodes, links: nextLinks }
})

// --- Filter actions -------------------------------------------------
function toggleClass(name) {
  const next = new Set(selectedClasses.value)
  next.has(name) ? next.delete(name) : next.add(name)
  selectedClasses.value = next
}
function toggleStatus(s) {
  const next = new Set(selectedStatuses.value)
  next.has(s) ? next.delete(s) : next.add(s)
  selectedStatuses.value = next
}
function clearFilters() {
  q.value = ''
  selectedClasses.value = new Set()
  selectedStatuses.value = new Set()
}
function selectAllClasses()  { selectedClasses.value = new Set(allClasses.value) }
function selectNoClasses()   { selectedClasses.value = new Set() }
function invertClasses() {
  const next = new Set()
  for (const c of allClasses.value) if (!selectedClasses.value.has(c)) next.add(c)
  selectedClasses.value = next
}
// Status → chip variant. Selected status chips colour-code in the
// filter bar so users see at a glance what they've narrowed by.
function statusChipClass(s) {
  if (s === 'registered')   return 'ok'
  if (s === 'pending')      return 'info'
  if (s === 'unregistered') return 'warn'
  if (s === 'isolated')     return 'bad'
  return ''
}
</script>

<template>
  <div class="page" style="max-width: 1480px">
    <div class="page-head">
      <div>
        <div class="page-title">Assets</div>
        <div class="page-sub">
          <template v-if="hasFilters">
            <b class="num">{{ filteredNodes.length.toLocaleString() }}</b>
            of {{ totalUnfiltered.toLocaleString() }} assets shown
          </template>
          <template v-else>
            Inventory rollup by device class, vendor and OS
          </template>
          <span v-if="loading" style="color: var(--text-faint); margin-left: 8px">loading…</span>
        </div>
      </div>
      <div class="page-tools">
        <button class="btn"><Icon name="download" :size="13" /> Export</button>
        <button class="btn"><Icon name="refresh" :size="13" /> Refresh</button>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="card asset-filters">
      <div class="asset-filter-row">
        <div class="tbl-search" style="flex:1; max-width:420px">
          <Icon name="search" />
          <input v-model="q" placeholder="Search by hostname, MAC, owner, IP, vendor, OS…" />
          <button v-if="q" class="btn sm ghost" @click="q = ''" title="Clear search"><Icon name="x" :size="12" /></button>
        </div>

        <div class="asset-chips">
          <span class="asset-chip-label">Status</span>
          <button
            v-for="s in STATUSES" :key="s"
            type="button"
            :class="['chip', selectedStatuses.has(s) ? statusChipClass(s) : '']"
            :style="selectedStatuses.has(s) ? '' : 'cursor:pointer'"
            @click="toggleStatus(s)"
          >{{ s }}</button>
        </div>

        <button
          v-if="hasFilters" class="btn sm ghost"
          style="margin-left:auto" @click="clearFilters"
        ><Icon name="x" :size="12" /> Clear filters</button>
      </div>

      <div class="asset-filter-row asset-classes-row">
        <span class="asset-chip-label">Device class</span>
        <button
          v-for="c in allClasses" :key="c"
          type="button"
          :class="['chip', selectedClasses.has(c) ? 'accent' : '']"
          style="cursor:pointer"
          @click="toggleClass(c)"
        >{{ c }}</button>
        <div class="asset-chip-tools">
          <button class="btn sm ghost" @click="selectAllClasses">All</button>
          <button class="btn sm ghost" @click="selectNoClasses">None</button>
          <button class="btn sm ghost" @click="invertClasses">Invert</button>
        </div>
      </div>
    </div>

    <!-- Network topology graph -->
    <div class="card" style="margin-bottom: 14px">
      <div class="card-head">
        <div>
          <div class="card-title">Network topology</div>
          <div class="card-sub">
            {{ (filteredGraph?.nodes || []).length.toLocaleString() }} nodes ·
            {{ (filteredGraph?.links || []).length.toLocaleString() }} links
            <template v-if="hasFilters">
              · <span style="color:var(--accent)">filtered</span>
            </template>
            · from <span class="mono">POST /api/v1/nodes/network_graph</span>
          </div>
        </div>
      </div>
      <NodeGraph
        :nodes="filteredGraph?.nodes || []"
        :links="filteredGraph?.links || []"
        :height="520"
      />
    </div>

    <!-- KPIs -->
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label"><Icon name="endpoints" :size="12" /> Total assets</div>
        <div class="kpi-value num">{{ totalAssets.toLocaleString() }}</div>
        <div class="kpi-delta">{{ classCount }} device class{{ classCount === 1 ? '' : 'es' }}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label"><Icon name="inspect" :size="12" /> Top class</div>
        <div class="kpi-value" style="font-size:18px; line-height:1.2">
          {{ topClass?.device_class || '—' }}
        </div>
        <div class="kpi-delta">{{ topClass?.count?.toLocaleString() || 0 }} ({{ pct(topClass?.count || 0) }}%)</div>
      </div>
      <div class="kpi">
        <div class="kpi-label"><Icon name="user" :size="12" /> Active registered</div>
        <div class="kpi-value num">{{ activePct }}<span class="unit">%</span></div>
        <div class="kpi-delta">{{ statusBreakdown.find(s => s.status === 'registered')?.count?.toLocaleString() }} registered</div>
      </div>
      <div class="kpi">
        <div class="kpi-label"><Icon name="alert" :size="12" /> Isolated</div>
        <div class="kpi-value num">{{ statusBreakdown.find(s => s.status === 'isolated')?.count || 0 }}</div>
        <div class="kpi-delta">{{ statusBreakdown.find(s => s.status === 'pending')?.count || 0 }} pending review</div>
      </div>
    </div>

    <!-- Device class donut + legend -->
    <div class="grid-2">
      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">Device classes</div>
            <div class="card-sub">
              {{ classRows.length }} class{{ classRows.length === 1 ? '' : 'es' }}
              <template v-if="hasFilters"> · filtered from {{ filteredNodes.length.toLocaleString() }} asset{{ filteredNodes.length === 1 ? '' : 's' }}</template>
              <template v-else> · live from /api/v1/nodes/per_device_class</template>
            </div>
          </div>
        </div>
        <div class="card-body" style="display:flex; gap:18px; align-items:center">
          <Donut :data="donutData" :size="160" />
          <div class="donut-legend" style="flex:1">
            <div v-for="r in classRows" :key="r.device_class" class="lg-row">
              <span class="sw" :style="{ background: r.color }" />
              <span class="lg-name">{{ r.device_class }}</span>
              <span class="lg-val">{{ r.count.toLocaleString() }}</span>
              <span class="lg-pct">{{ pct(r.count) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">Status</div>
            <div class="card-sub">From /api/v1/nodes</div>
          </div>
        </div>
        <div class="card-body">
          <div v-for="row in statusBreakdown" :key="row.status" class="asset-bar">
            <StatusChip :status="row.status" />
            <div class="asset-bar-track">
              <span :style="{
                width: (filteredNodes.length ? row.count / filteredNodes.length * 100 : 0) + '%',
                background: row.status === 'registered' ? 'var(--success)' :
                            row.status === 'pending' ? 'var(--info)' :
                            row.status === 'unregistered' ? 'var(--text-dim)' : 'var(--danger)',
              }" />
            </div>
            <span class="mono asset-bar-count">{{ row.count.toLocaleString() }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Vendor + OS top-lists -->
    <div class="grid-2">
      <div class="card">
        <div class="card-head">
          <div class="card-title">Top vendors</div>
          <div class="card-sub">By endpoint count</div>
        </div>
        <div class="card-body asset-list">
          <div v-for="v in topVendors" :key="v.name" class="asset-list-row">
            <span class="asset-list-name">{{ v.name }}</span>
            <div class="asset-bar-track">
              <span :style="{
                width: (topVendors[0]?.count ? v.count / topVendors[0].count * 100 : 0) + '%',
                background: 'var(--accent)'
              }" />
            </div>
            <span class="mono asset-list-count">{{ v.count.toLocaleString() }}</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div class="card-title">Top operating systems</div>
          <div class="card-sub">By endpoint count</div>
        </div>
        <div class="card-body asset-list">
          <div v-for="o in topOses" :key="o.name" class="asset-list-row">
            <span class="asset-list-name">{{ o.name }}</span>
            <div class="asset-bar-track">
              <span :style="{
                width: (topOses[0]?.count ? o.count / topOses[0].count * 100 : 0) + '%',
                background: 'var(--info)'
              }" />
            </div>
            <span class="mono asset-list-count">{{ o.count.toLocaleString() }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent endpoints (drill into the inspector from here too) -->
    <div class="card">
      <div class="card-head">
        <div class="card-title">Recent endpoints</div>
        <div class="card-sub">Click a row to open the inspector</div>
        <div class="card-tools">
          <router-link :to="{ name: 'endpoints' }" class="btn sm ghost" style="text-decoration:none">
            View all <Icon name="chevR" :size="12" />
          </router-link>
        </div>
      </div>
      <div style="overflow-x:auto">
        <table class="tbl">
          <thead>
            <tr>
              <th>Device</th>
              <th>MAC</th>
              <th>Class</th>
              <th>Vendor</th>
              <th>OS</th>
              <th>Last seen</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="n in recent" :key="n.id" @click="ui.openInspector(n)">
              <td>
                <span style="display:inline-flex; align-items:center; gap:8px">
                  <Icon :name="deviceIcon(n.type)" />
                  <span class="mono">{{ n.hostname }}</span>
                </span>
              </td>
              <td class="mono">{{ n.mac }}</td>
              <td>{{ n.type }}</td>
              <td style="color:var(--text-dim)">{{ n.vendor }}</td>
              <td style="color:var(--text-dim)">{{ n.os }}</td>
              <td class="mono" style="color:var(--text-dim)">{{ n.lastSeen }}</td>
              <td><StatusChip :status="n.status" /></td>
            </tr>
            <tr v-if="!loading && recent.length === 0">
              <td colspan="7" class="empty" style="text-align:center">No endpoints match the current filters.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<style scoped>
.asset-bar {
  display: grid;
  grid-template-columns: 100px 1fr 56px;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
}
.asset-bar:not(:last-child) { border-bottom: 1px solid var(--border); }
.asset-bar-track {
  height: 6px; background: var(--bg-elev-2);
  border-radius: 3px; overflow: hidden;
}
.asset-bar-track > span { display: block; height: 100%; }
.asset-bar-count { text-align: right; color: var(--text-dim); font-size: 11px; }

.asset-list { display: flex; flex-direction: column; }
.asset-list-row {
  display: grid;
  grid-template-columns: 180px 1fr 50px;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
}
.asset-list-row:not(:last-child) { border-bottom: 1px solid var(--border); }
.asset-list-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
}
.asset-list-count { text-align: right; color: var(--text-dim); font-size: 11px; }

/* Filter bar */
.asset-filters { margin-bottom: 14px; padding: 10px 12px; }
.asset-filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.asset-filter-row + .asset-filter-row { margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border); }
.asset-chip-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-faint);
  font-weight: 600;
  margin-right: 2px;
}
.asset-chips { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.asset-classes-row { gap: 6px; }
/* Make chips in the filter bar feel clickable + carry a hover hint
   so users discover they're toggles. Selected chips already
   colour-shift via the global .chip.ok/.warn/.bad/.accent. */
.asset-filter-row .chip { cursor: pointer; transition: background 0.1s, color 0.1s, border-color 0.1s; }
.asset-filter-row .chip:hover { background: var(--bg-hover); color: var(--text); }
.asset-filter-row .chip.ok:hover,
.asset-filter-row .chip.warn:hover,
.asset-filter-row .chip.bad:hover,
.asset-filter-row .chip.info:hover,
.asset-filter-row .chip.accent:hover { filter: brightness(1.08); background: var(--accent-soft); }
.asset-chip-tools { margin-left: auto; display: inline-flex; gap: 4px; }
</style>
