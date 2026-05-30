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
import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'
import { NAC_DATA, deviceIcon } from '@/data/mock'
import { nodesApi } from '@/api/nodes'
import { useResource } from '@/composables/useResource'
import Icon from '@/components/Icon.vue'
import Donut from '@/components/ui/Donut.vue'
import StatusChip from '@/components/ui/StatusChip.vue'

const ui = useUiStore()

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

const loading = computed(() => perClassLoading.value || nodesLoading.value)

const classRows = computed(() => {
  const rows = (perClass.value || []).slice().sort((a, b) => b.count - a.count)
  return rows.map((r, i) => ({ ...r, color: PALETTE[i % PALETTE.length] }))
})

const totalAssets = computed(() => classRows.value.reduce((s, r) => s + r.count, 0))
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

const topVendors = computed(() => topBy(nodes.value || [], 'vendor', 8))
const topOses    = computed(() => topBy(nodes.value || [], 'os',     8))

const statusBreakdown = computed(() => {
  const order = ['registered', 'pending', 'unregistered', 'isolated']
  const acc = new Map(order.map(k => [k, 0]))
  for (const n of nodes.value || []) {
    acc.set(n.status, (acc.get(n.status) || 0) + 1)
  }
  return order.map(k => ({ status: k, count: acc.get(k) || 0 }))
})

const activePct = computed(() => {
  const total = (nodes.value || []).length || 1
  const reg = statusBreakdown.value.find(s => s.status === 'registered')?.count || 0
  return Math.round(reg / total * 100)
})

// Recent additions for the inspector hook-up — last 8 by lastSeen text
// is a rough heuristic since lastSeen is a relative string in mock data;
// for real data lastSeen is sortable.
const recent = computed(() => (nodes.value || []).slice(0, 8))

function pct(count) {
  return totalAssets.value ? Math.round(count / totalAssets.value * 100) : 0
}
</script>

<template>
  <div class="page" style="max-width: 1480px">
    <div class="page-head">
      <div>
        <div class="page-title">Assets</div>
        <div class="page-sub">
          Inventory rollup by device class, vendor and OS
          <span v-if="loading" style="color: var(--text-faint); margin-left: 8px">loading…</span>
        </div>
      </div>
      <div class="page-tools">
        <button class="btn"><Icon name="download" :size="13" /> Export</button>
        <button class="btn"><Icon name="refresh" :size="13" /> Refresh</button>
      </div>
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
            <div class="card-sub">{{ classRows.length }} class{{ classRows.length === 1 ? '' : 'es' }} · live from /api/v1/nodes/per_device_class</div>
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
                width: ((nodes || []).length ? row.count / (nodes || []).length * 100 : 0) + '%',
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
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer note about the deferred graph view -->
    <div class="asset-note">
      The v1 admin's <span class="mono">/admin/status/assets</span> renders a force-directed network graph
      (data: <span class="mono">POST /api/v1/nodes/network_graph</span>). That visualisation is a
      separate piece of work — the rollups above use the same underlying nodes data so the
      inventory picture is intact without it.
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

.asset-note {
  margin-top: 14px;
  padding: 12px 14px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-dim);
  font-size: 12px;
  line-height: 1.6;
}
</style>
