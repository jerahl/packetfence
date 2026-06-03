<script setup>
// Status > Threats — security-events analytics + drill-down.
//
// Ports the v1 /admin/status/network_threats page, which is built on
// these endpoints:
//   GET  /api/v1/security_events/total_{open,closed,pending}
//   GET  /api/v1/security_events/per_security_event_id_{open,closed,pending}
//   GET  /api/v1/security_events/per_device_class_{open,closed,pending}
//   POST /api/v1/security_events/search
//   PUT  /api/v1/node/<mac>/close_security_event
//
// Everything narrows in lockstep with the status / severity / rule
// filters; the table includes a Release action that hits the v1
// close_security_event endpoint.
import { computed, ref } from 'vue'
import { useUiStore } from '@/stores/ui'
import { NAC_DATA } from '@/data/mock'
import { eventsApi } from '@/api/events'
import { useResource } from '@/composables/useResource'
import Icon from '@/components/Icon.vue'
import Donut from '@/components/ui/Donut.vue'

const ui = useUiStore()

const STATUSES   = ['open', 'pending', 'closed']
const SEVERITIES = ['critical', 'high', 'medium', 'low']

const status = ref('open')                  // segmented control
const q = ref('')                           // free-text search
const selectedSeverities = ref(new Set())   // multi-select chips
const selectedRules = ref(new Set())        // multi-select chips
const releaseBusy = ref(new Set())          // macs/ids currently releasing

const PALETTE = [
  'oklch(0.68 0.20 25)',  // danger
  'oklch(0.80 0.15 78)',  // warn
  'oklch(0.72 0.13 290)', // info
  'oklch(0.74 0.16 150)', // success
  'oklch(0.72 0.16 250)', // accent
  'oklch(0.70 0.14 200)',
  'oklch(0.75 0.14 350)',
  'oklch(0.78 0.10 100)',
]

// --- Mock fallbacks. Each derives from NAC_DATA.events so the page
// still renders end-to-end without a backend, matching the same shapes
// the real endpoints return.
const mockTotals = (() => {
  const counts = { open: 0, closed: 0, pending: 0 }
  for (const e of NAC_DATA.events) counts.open++  // mock events are all "open"
  return counts
})()
function mockPerRule() {
  const acc = new Map()
  for (const e of NAC_DATA.events) acc.set(e.rule, (acc.get(e.rule) || 0) + 1)
  return [...acc.entries()].map(([security_event_id, count]) => ({ security_event_id, count }))
}
function mockPerClass() {
  const acc = new Map()
  for (const e of NAC_DATA.events) {
    const k = e.node?.type || 'Unknown'
    acc.set(k, (acc.get(k) || 0) + 1)
  }
  return [...acc.entries()].map(([device_class, count]) => ({ device_class, count }))
}

// --- Live data ------------------------------------------------------
const { data: totals, loading: totalsLoading, refresh: refreshTotals } = useResource(
  () => eventsApi.totals(),
  { fallback: mockTotals },
)
const { data: perRule } = useResource(
  () => eventsApi.perRule(status.value),
  { fallback: mockPerRule(), key: status },
)
const { data: perClass } = useResource(
  () => eventsApi.perDeviceClass(status.value),
  { fallback: mockPerClass(), key: status },
)
const { data: events, loading: eventsLoading, refresh: refreshEvents } = useResource(
  () => eventsApi.search({ query: { op: 'and', values: [{ field: 'status', op: 'equals', value: status.value }] }, limit: 200 }).then(r => r.items),
  { fallback: NAC_DATA.events, key: status },
)

const loading = computed(() => totalsLoading.value || eventsLoading.value)

// --- Derived rollups ------------------------------------------------
const ruleRows = computed(() =>
  (perRule.value || []).slice().sort((a, b) => b.count - a.count),
)
const classRows = computed(() =>
  (perClass.value || []).slice().sort((a, b) => b.count - a.count)
    .map((r, i) => ({ ...r, color: PALETTE[i % PALETTE.length] })),
)
const donutData = computed(() =>
  classRows.value.slice(0, 8).map(r => ({ name: r.device_class, v: r.count, color: r.color })),
)
const topRule = computed(() => ruleRows.value[0])
const totalEvents = computed(() => ruleRows.value.reduce((s, r) => s + r.count, 0))

// Synthetic time-series for "events over last 24h" — there's no
// dedicated /per_hour endpoint, so derive from the loaded events list
// (real backend) or distribute the mock event count across 24 buckets
// (mock fallback). For real data we group by start_date's hour bucket.
const timeSeries = computed(() => {
  const buckets = Array.from({ length: 24 }, () => 0)
  for (const e of (events.value || [])) {
    const ts = e.time || e.start_date
    if (!ts) continue
    // Try to parse a real timestamp first; fall back to a "Nh ago"
    // string parse so mock data still produces something resembling
    // a trend.
    let hoursAgo = null
    const parsed = Date.parse(ts)
    if (!Number.isNaN(parsed)) {
      hoursAgo = Math.floor((Date.now() - parsed) / 3_600_000)
    } else {
      const m = ts.match(/^(\d+)\s*h\s*ago/i)
      if (m) hoursAgo = parseInt(m[1], 10)
      else if (/m\s*ago/i.test(ts) || /just now/i.test(ts)) hoursAgo = 0
    }
    if (hoursAgo === null || hoursAgo < 0 || hoursAgo >= 24) continue
    buckets[23 - hoursAgo]++
  }
  return buckets
})

// --- Filtering ------------------------------------------------------
const hasFilters = computed(() =>
  q.value.trim() !== '' || selectedSeverities.value.size > 0 || selectedRules.value.size > 0,
)
const filteredEvents = computed(() => {
  let list = events.value || []
  if (selectedSeverities.value.size > 0) {
    list = list.filter(e => selectedSeverities.value.has(e.severity))
  }
  if (selectedRules.value.size > 0) {
    list = list.filter(e => selectedRules.value.has(e.rule))
  }
  if (q.value) {
    const ql = q.value.toLowerCase()
    list = list.filter(e =>
      (e.rule || '').toLowerCase().includes(ql) ||
      (e.desc || '').toLowerCase().includes(ql) ||
      (e.id || '').toLowerCase().includes(ql) ||
      (e.node?.mac || '').toLowerCase().includes(ql) ||
      (e.node?.hostname || '').toLowerCase().includes(ql),
    )
  }
  return list
})

// All known rules (for the filter chip set), independent of which
// ones happen to match the current filter.
const allRules = computed(() => ruleRows.value.map(r => r.security_event_id))

// --- Actions --------------------------------------------------------
function toggleSeverity(s) {
  const next = new Set(selectedSeverities.value)
  next.has(s) ? next.delete(s) : next.add(s)
  selectedSeverities.value = next
}
function toggleRule(r) {
  const next = new Set(selectedRules.value)
  next.has(r) ? next.delete(r) : next.add(r)
  selectedRules.value = next
}
function clearFilters() {
  q.value = ''
  selectedSeverities.value = new Set()
  selectedRules.value = new Set()
}

async function releaseEvent(e) {
  const mac = e.node?.mac
  if (!mac || !e.id) return
  const key = `${mac}:${e.id}`
  if (releaseBusy.value.has(key)) return
  releaseBusy.value = new Set([...releaseBusy.value, key])
  try {
    await eventsApi.release(mac, e.id)
    // eslint-disable-next-line no-console
    console.info(`[Threats] released ${e.id} on ${mac}`)
    refreshTotals()
    refreshEvents()
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Threats] release failed:', err?.message || err)
  } finally {
    const next = new Set(releaseBusy.value)
    next.delete(key)
    releaseBusy.value = next
  }
}

function severityChipClass(s) {
  return s === 'critical' || s === 'high' ? 'bad' : s === 'medium' ? 'warn' : 'info'
}
function statusChipClass(s) {
  if (s === 'open')    return 'bad'
  if (s === 'pending') return 'warn'
  return 'ok' // closed
}

// --- Time-series chart geometry -------------------------------------
// Tiny inline area chart for the 24h bucket array. Kept in this view
// instead of pulling AreaChart so the data shape (1D number array, not
// {active, denied}) matches what we have.
const chartGeom = computed(() => {
  const data = timeSeries.value
  const W = 760, H = 160
  const padL = 30, padR = 8, padT = 6, padB = 18
  const innerW = W - padL - padR, innerH = H - padT - padB
  const max = Math.max(1, ...data)
  const x = i => padL + (i / (data.length - 1)) * innerW
  const y = v => padT + innerH - (v / max) * innerH
  const pts = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
  const line = 'M' + pts.join(' L')
  const area = `${line} L${padL + innerW},${padT + innerH} L${padL},${padT + innerH} Z`
  const ticks = [0, 0.5, 1].map(p => ({ y: padT + innerH * (1 - p), v: Math.round(max * p) }))
  const xLabels = [0, 6, 12, 18, 23].map(i => ({ x: x(i), label: `${i - 23 + 23}h` })) // 0..23h ago
  // Show "now / -6h / -12h / -18h / -24h" rather than 0..23 raw
  const niceXLabels = [
    { x: x(23), label: 'now' },
    { x: x(17), label: '-6h' },
    { x: x(11), label: '-12h' },
    { x: x(5),  label: '-18h' },
    { x: x(0),  label: '-24h' },
  ]
  return { W, H, line, area, ticks, xLabels: niceXLabels }
})
</script>

<template>
  <div class="page" style="max-width: 1480px">
    <div class="page-head">
      <div>
        <div class="page-title">Threats</div>
        <div class="page-sub">
          Security event analytics from <span class="mono">/api/v1/security_events/*</span>
          <span v-if="loading" style="color: var(--text-faint); margin-left: 8px">loading…</span>
        </div>
      </div>
      <div class="page-tools">
        <div class="segmented">
          <button v-for="s in STATUSES" :key="s"
                  :class="{ on: status === s }"
                  @click="status = s">{{ s }}</button>
        </div>
        <button class="btn" @click="() => { refreshTotals(); refreshEvents() }">
          <Icon name="refresh" :size="13" /> Refresh
        </button>
        <button class="btn"><Icon name="download" :size="13" /> Export</button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid">
      <div class="kpi"
           :class="{ active: status === 'open' }"
           style="cursor:pointer" @click="status = 'open'">
        <div class="kpi-label">
          <span class="dot" style="background:var(--danger)"></span> Open
        </div>
        <div class="kpi-value num">{{ (totals?.open ?? 0).toLocaleString() }}</div>
        <div class="kpi-delta">Auto-isolation eligible</div>
      </div>
      <div class="kpi"
           :class="{ active: status === 'pending' }"
           style="cursor:pointer" @click="status = 'pending'">
        <div class="kpi-label">
          <span class="dot" style="background:var(--warn)"></span> Pending
        </div>
        <div class="kpi-value num">{{ (totals?.pending ?? 0).toLocaleString() }}</div>
        <div class="kpi-delta">Awaiting review / re-auth</div>
      </div>
      <div class="kpi"
           :class="{ active: status === 'closed' }"
           style="cursor:pointer" @click="status = 'closed'">
        <div class="kpi-label">
          <span class="dot" style="background:var(--success)"></span> Closed
        </div>
        <div class="kpi-value num">{{ (totals?.closed ?? 0).toLocaleString() }}</div>
        <div class="kpi-delta">Released or auto-resolved</div>
      </div>
      <div class="kpi">
        <div class="kpi-label"><Icon name="alert" :size="12" /> Top rule</div>
        <div class="kpi-value" style="font-size:14px; line-height:1.2; word-break:break-word">
          {{ topRule?.security_event_id || '—' }}
        </div>
        <div class="kpi-delta">{{ topRule?.count?.toLocaleString() || 0 }} events</div>
      </div>
    </div>

    <!-- Time series + per-class donut -->
    <div class="grid-2">
      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">Events over the last 24h</div>
            <div class="card-sub">Hourly buckets · {{ status }} · derived from /security_events/search</div>
          </div>
        </div>
        <div class="card-body" style="padding:10px 14px 6px">
          <svg :viewBox="`0 0 ${chartGeom.W} ${chartGeom.H}`" preserveAspectRatio="none" style="display:block; width:100%">
            <line v-for="(t, i) in chartGeom.ticks" :key="'tg'+i"
                  :x1="30" :x2="chartGeom.W - 8" :y1="t.y" :y2="t.y"
                  stroke="var(--border)" stroke-dasharray="2 4" />
            <text v-for="(t, i) in chartGeom.ticks" :key="'tt'+i"
                  :x="24" :y="t.y + 3" text-anchor="end" font-size="9"
                  fill="var(--text-faint)" font-family="var(--font-mono)">{{ t.v }}</text>
            <text v-for="(l, i) in chartGeom.xLabels" :key="'tx'+i"
                  :x="l.x" :y="chartGeom.H - 4" text-anchor="middle" font-size="9"
                  fill="var(--text-faint)" font-family="var(--font-mono)">{{ l.label }}</text>
            <path :d="chartGeom.area" fill="var(--danger-soft)" />
            <path :d="chartGeom.line" fill="none" stroke="var(--danger)" stroke-width="1.4" />
          </svg>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">By device class</div>
            <div class="card-sub">{{ classRows.length }} classes · scope: {{ status }}</div>
          </div>
        </div>
        <div class="card-body" style="display:flex; gap:18px; align-items:center">
          <Donut :data="donutData" :size="140" />
          <div class="donut-legend" style="flex:1">
            <div v-for="r in classRows" :key="r.device_class" class="lg-row">
              <span class="sw" :style="{ background: r.color }" />
              <span class="lg-name">{{ r.device_class }}</span>
              <span class="lg-val">{{ r.count.toLocaleString() }}</span>
              <span class="lg-pct">{{ totalEvents ? Math.round(r.count / totalEvents * 100) : 0 }}%</span>
            </div>
            <div v-if="classRows.length === 0" class="empty">No events.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Top rules -->
    <div class="card" style="margin-bottom: 14px">
      <div class="card-head">
        <div class="card-title">Top rules</div>
        <div class="card-sub">{{ ruleRows.length }} unique · scope: {{ status }}</div>
      </div>
      <div class="card-body asset-list">
        <div v-for="r in ruleRows.slice(0, 8)" :key="r.security_event_id" class="asset-list-row">
          <span class="asset-list-name">{{ r.security_event_id }}</span>
          <div class="asset-bar-track">
            <span :style="{
              width: (ruleRows[0]?.count ? r.count / ruleRows[0].count * 100 : 0) + '%',
              background: 'var(--danger)'
            }" />
          </div>
          <span class="mono asset-list-count">{{ r.count.toLocaleString() }}</span>
        </div>
        <div v-if="ruleRows.length === 0" class="empty">No rules matched.</div>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="card threats-filters">
      <div class="threats-filter-row">
        <div class="tbl-search" style="flex:1; max-width:420px">
          <Icon name="search" />
          <input v-model="q" placeholder="Search by rule, MAC, hostname, description, id…" />
          <button v-if="q" class="btn sm ghost" @click="q = ''" title="Clear search">
            <Icon name="x" :size="12" />
          </button>
        </div>
        <div class="threats-chips">
          <span class="threats-chip-label">Severity</span>
          <button
            v-for="s in SEVERITIES" :key="s"
            type="button"
            :class="['chip', selectedSeverities.has(s) ? severityChipClass(s) : '']"
            style="cursor:pointer"
            @click="toggleSeverity(s)"
          >{{ s }}</button>
        </div>
        <button v-if="hasFilters" class="btn sm ghost" style="margin-left:auto" @click="clearFilters">
          <Icon name="x" :size="12" /> Clear filters
        </button>
      </div>
      <div class="threats-filter-row threats-rules-row">
        <span class="threats-chip-label">Rule</span>
        <button
          v-for="r in allRules" :key="r"
          type="button"
          :class="['chip', selectedRules.has(r) ? 'accent' : '']"
          style="cursor:pointer"
          @click="toggleRule(r)"
        >{{ r }}</button>
        <div v-if="allRules.length === 0" style="color:var(--text-faint); font-size:11px">
          No rules in this scope.
        </div>
      </div>
    </div>

    <!-- Events table -->
    <div class="tbl-wrap">
      <div class="tbl-toolbar">
        <span style="font-size:12px; color:var(--text-dim)">
          Showing <b class="num">{{ filteredEvents.length }}</b>
          <template v-if="hasFilters || (events && events.length !== filteredEvents.length)">
            of {{ (events || []).length }}
          </template>
          {{ status }} event{{ filteredEvents.length === 1 ? '' : 's' }}
        </span>
      </div>
      <table class="tbl">
        <thead>
          <tr>
            <th>Severity</th>
            <th>Rule</th>
            <th>Endpoint</th>
            <th>Action</th>
            <th>Detail</th>
            <th>Time</th>
            <th class="actions-col"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in filteredEvents" :key="e.id"
              @click="e.node && ui.openInspector(e.node)">
            <td>
              <span :class="['chip', severityChipClass(e.severity)]">
                <span v-if="e.severity === 'critical'" class="pulse" />{{ e.severity }}
              </span>
            </td>
            <td>
              <span style="font-weight:500">{{ e.rule }}</span>
              <span class="mono" style="color:var(--text-faint); font-size:10px; margin-left:6px">{{ e.id }}</span>
            </td>
            <td>
              <span class="mono">{{ e.node?.mac }}</span>
              <span v-if="e.node?.hostname && e.node.hostname !== e.node.mac" style="color:var(--text-dim)">
                · {{ e.node.hostname }}
              </span>
            </td>
            <td><span :class="['chip', e.action === 'isolated' ? 'bad' : 'info']">{{ e.action }}</span></td>
            <td style="color:var(--text-dim); max-width:360px; overflow:hidden; text-overflow:ellipsis">
              {{ e.desc }}
            </td>
            <td class="mono" style="color:var(--text-dim)">{{ e.time }}</td>
            <td class="actions-col" @click.stop>
              <button
                v-if="status === 'open' && e.node?.mac"
                class="btn sm danger"
                :disabled="releaseBusy.has(`${e.node.mac}:${e.id}`)"
                @click="releaseEvent(e)"
              >
                {{ releaseBusy.has(`${e.node.mac}:${e.id}`) ? 'Releasing…' : 'Release' }}
              </button>
            </td>
          </tr>
          <tr v-if="!loading && filteredEvents.length === 0">
            <td colspan="7" class="empty" style="text-align:center">
              No {{ status }} events match the current filters.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.kpi.active { outline: 1px solid var(--accent); }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }

.asset-list { display: flex; flex-direction: column; }
.asset-list-row {
  display: grid;
  grid-template-columns: 280px 1fr 56px;
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
  font-weight: 500;
}
.asset-bar-track {
  height: 6px; background: var(--bg-elev-2);
  border-radius: 3px; overflow: hidden;
}
.asset-bar-track > span { display: block; height: 100%; }
.asset-list-count { text-align: right; color: var(--text-dim); font-size: 11px; }

/* Filter bar — same pattern Assets uses; kept local so the page is
   editable without cross-cutting the other view. */
.threats-filters { margin-bottom: 14px; padding: 10px 12px; }
.threats-filter-row {
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
}
.threats-filter-row + .threats-filter-row {
  margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border);
}
.threats-chip-label {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--text-faint); font-weight: 600; margin-right: 2px;
}
.threats-chips { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.threats-rules-row { gap: 6px; }
.threats-filter-row .chip { cursor: pointer; transition: background 0.1s, color 0.1s, border-color 0.1s; }
.threats-filter-row .chip:hover { background: var(--bg-hover); color: var(--text); }
</style>
