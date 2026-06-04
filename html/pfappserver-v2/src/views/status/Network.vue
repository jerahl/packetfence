<script setup>
// Status > Network — live network-stack throughput and errors, sourced
// from Netdata's global system.net / ipv4.* / ipv6.* charts (the same
// charts the v1 Status > Monitoring "System" tab grouped under
// "Physical Network Interfaces", "IPv4 Networking" and "IPv6 Networking").
//
// Layout mirrors Status > Monitoring: a time-range segmented control, a
// 12-column NetdataChart grid grouped into cards, and an "Open in Netdata"
// hand-off. On top of that it adds a KPI row that reads the freshest sample
// of a few headline charts via api/netdata.latest(). Everything degrades
// silently to mock figures (useResource `fallback`) when Netdata isn't
// reachable, so the page renders end-to-end without a backend.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { DEFAULT_HOST, latest } from '@/api/netdata'
import { useResource } from '@/composables/useResource'
import Icon from '@/components/Icon.vue'
import NetdataChart from '@/components/ui/NetdataChart.vue'

// Host the charts query — same reverse-proxy path the other Status pages
// use. Multi-node selection lands when /cluster servers is wired in v2.
const host = DEFAULT_HOST

// 'Show last' range — drives `after` (seconds) on every chart. Identical
// set to the Monitoring page so the two feel like one surface.
const PERIODS = [
  { text: '5m',  value: -60 * 5,         title: '5 minutes' },
  { text: '15m', value: -60 * 15,        title: '15 minutes' },
  { text: '1h',  value: -60 * 60,        title: '1 hour' },
  { text: '6h',  value: -60 * 60 * 6,    title: '6 hours' },
  { text: '24h', value: -60 * 60 * 24,   title: '24 hours' },
  { text: '7d',  value: -60 * 60 * 24 * 7, title: '7 days' },
]
const after = ref(-3600)

// Bumping this remounts the chart grid, forcing an immediate refetch when
// the user hits Refresh (changing `after` already refetches on its own).
const reloadKey = ref(0)

// --- Chart grid -----------------------------------------------------
// Static config — these are Netdata's well-known global charts, so no
// runtime /api/v1/charts discovery is needed (unlike Services / Queue).
const GROUPS = [
  {
    name: 'Interfaces & Bandwidth',
    items: [
      { title: 'Aggregated bandwidth', metric: 'system.net',  cols: 12 },
      { title: 'IPv4 bandwidth',       metric: 'system.ip',   cols: 6 },
      { title: 'IPv6 bandwidth',       metric: 'system.ipv6', cols: 6 },
    ],
  },
  {
    name: 'IPv4 Networking',
    items: [
      { title: 'Packets',     metric: 'ipv4.packets',              cols: 6 },
      { title: 'Errors',      metric: 'ipv4.errors',               cols: 6 },
      { title: 'TCP sockets', metric: 'ipv4.sockstat_tcp_sockets', cols: 6 },
      { title: 'UDP sockets', metric: 'ipv4.sockstat_udp_sockets', cols: 6 },
    ],
  },
  {
    name: 'IPv6 Networking',
    items: [
      { title: 'Packets',     metric: 'ipv6.packets',               cols: 6 },
      { title: 'Errors',      metric: 'ipv6.errors',                cols: 6 },
      { title: 'TCP sockets', metric: 'ipv6.sockstat6_tcp_sockets', cols: 6 },
      { title: 'UDP sockets', metric: 'ipv6.sockstat6_udp_sockets', cols: 6 },
    ],
  },
]

function colClass(cols) {
  return `net-col net-col-${Math.min(Math.max(cols ?? 6, 1), 12)}`
}

// --- KPIs -----------------------------------------------------------
// Headline figures read from the freshest sample of a handful of charts.
// system.net is in kilobits/s and reports sent as a negative dimension,
// so latest() hands back inbound / outbound already split by sign.
const MOCK_KPIS = { inbound: 412_000, outbound: 88_500, packets: 18_240, errors: 0, tcp: 326 }

async function loadKpis() {
  // Degrade as a unit: if any read fails, useResource swaps in MOCK_KPIS.
  const [net, pkts, errs, tcp] = await Promise.all([
    latest('system.net', { host }),
    latest('ipv4.packets', { host }),
    latest('ipv4.errors', { host }),
    latest('ipv4.sockstat_tcp_sockets', { host }),
  ])
  return {
    inbound: net.inbound,
    outbound: net.outbound,
    packets: pkts.total,
    errors: errs.total,
    tcp: tcp.total,
  }
}

const { data: kpis, loading: kpisLoading, refresh: refreshKpis } =
  useResource(loadKpis, { fallback: MOCK_KPIS })

// Keep the KPI row live without waiting for a manual refresh — matches
// NetdataChart's own 30s cadence so the whole page ticks together.
let kpiTimer = null
onMounted(() => { kpiTimer = setInterval(refreshKpis, 30000) })
onBeforeUnmount(() => { if (kpiTimer) clearInterval(kpiTimer) })

function refreshAll() {
  refreshKpis()
  reloadKey.value++
}

// kilobits/s → a human rate, promoting to Mbit/s past 1000.
function fmtRate(kbit) {
  if (typeof kbit !== 'number' || !Number.isFinite(kbit)) return { v: '—', unit: 'kbit/s' }
  if (kbit >= 1000) return { v: (kbit / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 }), unit: 'Mbit/s' }
  return { v: kbit.toLocaleString(undefined, { maximumFractionDigits: 1 }), unit: 'kbit/s' }
}
function fmtCount(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—'
  return Math.round(n).toLocaleString()
}

const inbound  = computed(() => fmtRate(kpis.value?.inbound))
const outbound = computed(() => fmtRate(kpis.value?.outbound))
const errorsHealthy = computed(() => (kpis.value?.errors ?? 0) === 0)
</script>

<template>
  <div class="page" style="max-width: 1600px">
    <div class="page-head">
      <div>
        <div class="page-title">Network</div>
        <div class="page-sub">
          Netdata · live network-stack throughput and errors
          <span class="mono" style="color:var(--text-faint); margin-left:6px">system.net · ipv4.* · ipv6.*</span>
          <span v-if="kpisLoading" style="color:var(--text-faint); margin-left:8px">loading…</span>
        </div>
      </div>
      <div class="page-tools">
        <span style="font-size:11px; color:var(--text-dim); margin-right:4px">Show last</span>
        <div class="segmented">
          <button
            v-for="p in PERIODS" :key="p.text"
            :class="{ on: after === p.value }"
            :title="p.title"
            @click="after = p.value"
          >{{ p.text }}</button>
        </div>
        <button class="btn" @click="refreshAll"><Icon name="refresh" :size="13" /> Refresh</button>
        <a :href="`${host}/`" target="_blank" class="btn" style="text-decoration:none">
          <Icon name="globe" :size="13" /> Open in Netdata
        </a>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label"><Icon name="signal" :size="12" /> Inbound</div>
        <div class="kpi-value num">{{ inbound.v }} <span class="kpi-unit">{{ inbound.unit }}</span></div>
        <div class="kpi-delta">system.net · received</div>
      </div>
      <div class="kpi">
        <div class="kpi-label"><Icon name="bolt" :size="12" /> Outbound</div>
        <div class="kpi-value num">{{ outbound.v }} <span class="kpi-unit">{{ outbound.unit }}</span></div>
        <div class="kpi-delta">system.net · sent</div>
      </div>
      <div class="kpi">
        <div class="kpi-label"><Icon name="network" :size="12" /> IPv4 packets</div>
        <div class="kpi-value num">{{ fmtCount(kpis?.packets) }} <span class="kpi-unit">pps</span></div>
        <div class="kpi-delta">ipv4.packets · received + sent</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">
          <span class="dot" :style="{ background: errorsHealthy ? 'var(--success)' : 'var(--danger)' }"></span>
          IPv4 errors
        </div>
        <div class="kpi-value num">{{ fmtCount(kpis?.errors) }} <span class="kpi-unit">err/s</span></div>
        <div class="kpi-delta">{{ errorsHealthy ? 'No interface errors' : 'Errors on the wire' }}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label"><Icon name="globe" :size="12" /> TCP sockets</div>
        <div class="kpi-value num">{{ fmtCount(kpis?.tcp) }}</div>
        <div class="kpi-delta">ipv4.sockstat_tcp_sockets</div>
      </div>
    </div>

    <!-- Chart grid -->
    <div v-for="group in GROUPS" :key="group.name" class="card net-group">
      <div class="card-head">
        <div class="card-title">{{ group.name }}</div>
        <div class="card-sub">{{ group.items.length }} chart{{ group.items.length === 1 ? '' : 's' }}</div>
      </div>
      <div class="card-body net-grid">
        <div
          v-for="(chart, i) in group.items" :key="`${group.name}-${i}-${chart.metric}`"
          :class="colClass(chart.cols)"
        >
          <NetdataChart
            :key="`${reloadKey}-${chart.metric}`"
            :host="host"
            :metric="chart.metric"
            :title="chart.title"
            :after="after"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.kpi-unit { font-size: 11px; font-weight: 500; color: var(--text-faint); }

/* Five headline metrics — override the global 4-col kpi-grid so the row
   stays balanced instead of orphaning the fifth card. */
.kpi-grid { grid-template-columns: repeat(5, 1fr); }
@media (max-width: 1100px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }

.net-group { margin-bottom: 14px; }
.net-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 12px;
}
/* Bootstrap-equivalent col widths so the cols numbers map 1:1, same as
   the Monitoring grid. */
.net-col-1  { grid-column: span 1; }
.net-col-2  { grid-column: span 2; }
.net-col-3  { grid-column: span 3; }
.net-col-4  { grid-column: span 4; }
.net-col-5  { grid-column: span 5; }
.net-col-6  { grid-column: span 6; }
.net-col-7  { grid-column: span 7; }
.net-col-8  { grid-column: span 8; }
.net-col-9  { grid-column: span 9; }
.net-col-10 { grid-column: span 10; }
.net-col-11 { grid-column: span 11; }
.net-col-12 { grid-column: span 12; }
@media (max-width: 1100px) {
  .net-grid { grid-template-columns: repeat(6, 1fr); }
  .net-col-1,.net-col-2,.net-col-3,.net-col-4,.net-col-5 { grid-column: span 3; }
  .net-col-6,.net-col-7,.net-col-8,.net-col-9,.net-col-10,.net-col-11,.net-col-12 { grid-column: span 6; }
}
</style>
