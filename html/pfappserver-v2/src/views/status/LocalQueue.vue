<script setup>
// Status > Local Queue — pfqueue depth and per-task-type counters, plus the
// Redis backing-store charts. Mirrors the v1 /admin/status/queue page (queue
// counts + Outstanding / Expired task counters), polled every 15s, and adds
// the Netdata redis-queue charts the route was always meant to surface.
//
//   GET /api/v1/queues/stats -> [{ queue, stats: { count, outstanding[], expired[] } }]
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { queueApi } from '@/api/queue'
import { useResource } from '@/composables/useResource'
import { MOCK_QUEUE_STATS } from '@/data/mock'
import { DEFAULT_HOST } from '@/api/netdata'
import Icon from '@/components/Icon.vue'
import NetdataChart from '@/components/ui/NetdataChart.vue'

const host = DEFAULT_HOST

const { data: items, loading, refresh } = useResource(
  () => queueApi.stats(),
  { fallback: MOCK_QUEUE_STATS },
)

// pfqueue depth changes second-to-second under load; keep it live.
let timer = null
onMounted(() => { timer = setInterval(refresh, 15000) })
onBeforeUnmount(() => { if (timer) clearInterval(timer) })

const depth = computed(() =>
  (items.value || [])
    .map(it => ({ queue: it.queue, count: it.stats?.count || 0 }))
    .sort((a, b) => b.count - a.count))

function flatten(kind) {
  const rows = []
  for (const it of (items.value || [])) {
    for (const t of (it.stats?.[kind] || [])) {
      rows.push({ queue: it.queue, name: t.name, count: t.count })
    }
  }
  return rows.sort((a, b) => b.count - a.count)
}
const outstanding = computed(() => flatten('outstanding'))
const expired = computed(() => flatten('expired'))

const maxDepth = computed(() => depth.value.reduce((m, d) => Math.max(m, d.count), 0))
const counts = computed(() => ({
  queued: depth.value.reduce((s, d) => s + d.count, 0),
  queues: depth.value.length,
  outstanding: outstanding.value.reduce((s, r) => s + r.count, 0),
  expired: expired.value.reduce((s, r) => s + r.count, 0),
}))

// Redis-backed pfqueue charts (same metrics the Monitoring "Queue" tab uses).
const CHARTS = [
  { title: 'Queue depth',   metric: 'packetfence.redis.queue_stats_count' },
  { title: 'Outstanding',   metric: 'packetfence.redis.queue_stats_outstanding' },
  { title: 'Expired',       metric: 'packetfence.redis.queue_stats_expired' },
  { title: 'Redis memory',  metric: 'redis_redis-queue.memory' },
]
</script>

<template>
  <div class="page" style="max-width: 1280px">
    <div class="page-head">
      <div>
        <div class="page-title">Local Queue</div>
        <div class="page-sub">
          pfqueue depth and task counters · <span class="mono">/api/v1/queues/stats</span>
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
        <div class="kpi-label"><Icon name="list" :size="12" /> Queued</div>
        <div class="kpi-value num">{{ counts.queued.toLocaleString() }}</div>
        <div class="kpi-delta">tasks waiting across all queues</div>
      </div>
      <div class="kpi">
        <div class="kpi-label"><Icon name="switch" :size="12" /> Queues</div>
        <div class="kpi-value num">{{ counts.queues }}</div>
        <div class="kpi-delta">active pfqueue queues</div>
      </div>
      <div class="kpi">
        <div class="kpi-label"><span class="dot" style="background:var(--warn)"></span> Outstanding</div>
        <div class="kpi-value num">{{ counts.outstanding.toLocaleString() }}</div>
        <div class="kpi-delta">in-flight task counters</div>
      </div>
      <div class="kpi">
        <div class="kpi-label"><span class="dot" style="background:var(--danger)"></span> Expired</div>
        <div class="kpi-value num">{{ counts.expired.toLocaleString() }}</div>
        <div class="kpi-delta">timed-out task counters</div>
      </div>
    </div>

    <!-- Queue depth -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-head">
        <div class="card-title">Queue depth</div>
        <div class="card-sub">{{ depth.length }} queue{{ depth.length === 1 ? '' : 's' }}</div>
      </div>
      <div class="card-body bar-list">
        <div v-for="d in depth" :key="d.queue" class="bar-row">
          <span class="bar-name mono">{{ d.queue }}</span>
          <div class="bar-track">
            <span :style="{ width: (maxDepth ? d.count / maxDepth * 100 : 0) + '%', background: d.count > 0 ? 'var(--accent)' : 'var(--border)' }" />
          </div>
          <span class="mono bar-count">{{ d.count.toLocaleString() }}</span>
        </div>
        <div v-if="depth.length === 0" class="empty">No queues reporting.</div>
      </div>
    </div>

    <!-- Outstanding + Expired counters -->
    <div class="counter-cols">
      <div class="card">
        <div class="card-head">
          <div class="card-title">Outstanding task counters</div>
          <div class="card-sub">{{ outstanding.length }} task type{{ outstanding.length === 1 ? '' : 's' }}</div>
        </div>
        <table class="tbl">
          <thead><tr><th>Queue</th><th>Task type</th><th class="num" style="text-align:right">Count</th></tr></thead>
          <tbody>
            <tr v-for="(r, i) in outstanding" :key="'o'+i">
              <td class="mono">{{ r.queue }}</td>
              <td class="mono" style="color:var(--text-dim)">{{ r.name }}</td>
              <td class="mono" style="text-align:right">{{ r.count.toLocaleString() }}</td>
            </tr>
            <tr v-if="outstanding.length === 0"><td colspan="3" class="empty" style="text-align:center">None outstanding.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-head">
          <div class="card-title">Expired task counters</div>
          <div class="card-sub">{{ expired.length }} task type{{ expired.length === 1 ? '' : 's' }}</div>
        </div>
        <table class="tbl">
          <thead><tr><th>Queue</th><th>Task type</th><th class="num" style="text-align:right">Count</th></tr></thead>
          <tbody>
            <tr v-for="(r, i) in expired" :key="'e'+i">
              <td class="mono">{{ r.queue }}</td>
              <td class="mono" style="color:var(--text-dim)">{{ r.name }}</td>
              <td class="mono" style="text-align:right">{{ r.count.toLocaleString() }}</td>
            </tr>
            <tr v-if="expired.length === 0"><td colspan="3" class="empty" style="text-align:center">None expired.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Redis backing store (Netdata) -->
    <div class="card" style="margin-top:14px">
      <div class="card-head">
        <div class="card-title">Backing store</div>
        <div class="card-sub">Netdata · redis-queue · last hour</div>
      </div>
      <div class="card-body queue-grid">
        <NetdataChart v-for="c in CHARTS" :key="c.metric" :host="host" :metric="c.metric" :title="c.title" :after="-3600" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }

.bar-list { display: flex; flex-direction: column; }
.bar-row { display: grid; grid-template-columns: 220px 1fr 72px; align-items: center; gap: 10px; padding: 7px 0; }
.bar-row:not(:last-child) { border-bottom: 1px solid var(--border); }
.bar-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px; }
.bar-track { height: 6px; background: var(--bg-elev-2); border-radius: 3px; overflow: hidden; }
.bar-track > span { display: block; height: 100%; }
.bar-count { text-align: right; color: var(--text-dim); font-size: 11px; }

.counter-cols { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.queue-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (max-width: 900px) { .counter-cols, .queue-grid { grid-template-columns: 1fr; } }
</style>
