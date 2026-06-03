<script setup>
// Security events page — port of the design's security.jsx.
// Severity KPI tiles double as filters; clicking one narrows the list.
import { computed, ref } from 'vue'
import { useUiStore } from '@/stores/ui'
import { NAC_DATA } from '@/data/mock'
import { eventsApi } from '@/api/events'
import { useResource } from '@/composables/useResource'
import Icon from '@/components/Icon.vue'

const ui = useUiStore()

const q = ref('')
const sev = ref('all')               // 'all' | 'critical' | 'high' | 'medium' | 'low'

// Live events with mock fallback (same pattern as Overview's panels).
const { data: events, loading, refresh } = useResource(
  () => eventsApi.listOpen({ limit: 500 }),
  { fallback: NAC_DATA.events },
)

const list = computed(() => events.value || [])

const sevCounts = computed(() => ({
  critical: list.value.filter(e => e.severity === 'critical').length,
  high:     list.value.filter(e => e.severity === 'high').length,
  medium:   list.value.filter(e => e.severity === 'medium').length,
  low:      list.value.filter(e => e.severity === 'low').length,
}))

const filtered = computed(() => {
  let out = list.value
  if (sev.value !== 'all') out = out.filter(e => e.severity === sev.value)
  if (q.value) {
    const ql = q.value.toLowerCase()
    out = out.filter(e =>
      (e.rule || '').toLowerCase().includes(ql) ||
      (e.desc || '').toLowerCase().includes(ql) ||
      (e.node?.mac || '').toLowerCase().includes(ql) ||
      (e.node?.hostname || '').toLowerCase().includes(ql),
    )
  }
  return out
})

function severityChipClass(s) {
  return s === 'critical' || s === 'high' ? 'bad' : s === 'medium' ? 'warn' : 'info'
}
function actionChipClass(a) {
  if (a === 'isolated') return 'bad'
  if (a === 'quarantine' || a === 'registration') return 'warn'
  return 'info'
}

const headSub = computed(() => {
  const n = list.value.length
  const crit = sevCounts.value.critical
  return `${n.toLocaleString()} open · ${crit} critical · auto-isolation enabled`
})
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">Security events</div>
        <div class="page-sub">
          {{ headSub }}
          <span v-if="loading" style="color: var(--text-faint); margin-left: 8px">loading…</span>
        </div>
      </div>
      <div class="page-tools">
        <button class="btn" @click="refresh"><Icon name="refresh" :size="13" /> Refresh</button>
        <button class="btn"><Icon name="download" :size="13" /> Export</button>
        <button class="btn primary"><Icon name="plus" :size="13" /> New rule</button>
      </div>
    </div>

    <!-- Severity KPI tiles: click a tile to filter the table below. -->
    <div class="kpi-grid">
      <div
        v-for="tier in [
          { id: 'critical', label: 'Critical', color: 'var(--danger)', opacity: 1,   note: 'Auto-isolated' },
          { id: 'high',     label: 'High',     color: 'var(--danger)', opacity: 0.6, note: 'Pending review' },
          { id: 'medium',   label: 'Medium',   color: 'var(--warn)',   opacity: 1,   note: 'Re-auth required' },
          { id: 'low',      label: 'Low',      color: 'var(--info)',   opacity: 1,   note: 'Logged' },
        ]"
        :key="tier.id"
        class="kpi"
        :style="{ cursor: 'pointer', outline: sev === tier.id ? '1px solid var(--accent)' : 'none' }"
        @click="sev = sev === tier.id ? 'all' : tier.id"
      >
        <div class="kpi-label">
          <span :style="{ width: '8px', height: '8px', borderRadius: '50%', background: tier.color, opacity: tier.opacity }" />
          {{ tier.label }}
        </div>
        <div class="kpi-value num">{{ sevCounts[tier.id] }}</div>
        <div class="kpi-delta">{{ tier.note }}</div>
      </div>
    </div>

    <div class="tbl-wrap">
      <div class="tbl-toolbar">
        <div class="tbl-search">
          <Icon name="search" />
          <input v-model="q" placeholder="Search by rule, MAC, hostname…" />
        </div>
        <div class="segmented">
          <button :class="{ on: sev === 'all' }"      @click="sev = 'all'">All</button>
          <button :class="{ on: sev === 'critical' }" @click="sev = 'critical'">Critical</button>
          <button :class="{ on: sev === 'high' }"     @click="sev = 'high'">High</button>
          <button :class="{ on: sev === 'medium' }"   @click="sev = 'medium'">Medium</button>
          <button :class="{ on: sev === 'low' }"      @click="sev = 'low'">Low</button>
        </div>
        <button class="tbl-filter"><Icon name="filter" :size="12" /> Time</button>
        <button class="tbl-filter"><Icon name="filter" :size="12" /> Action</button>
        <button class="tbl-filter"><Icon name="plus" :size="12" /> Add filter</button>
        <div style="margin-left:auto; color:var(--text-dim); font-size:11px; display:flex; align-items:center; gap:6px">
          <Icon name="clock" :size="12" /> Live
        </div>
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
          <tr v-for="e in filtered" :key="e.id" @click="e.node && ui.openInspector(e.node)">
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
            <td><span :class="['chip', actionChipClass(e.action)]">{{ e.action }}</span></td>
            <td style="color:var(--text-dim); max-width:360px; overflow:hidden; text-overflow:ellipsis">{{ e.desc }}</td>
            <td class="mono" style="color:var(--text-dim)">{{ e.time }}</td>
            <td class="actions-col" @click.stop>
              <button class="btn sm ghost"><Icon name="more" :size="13" /></button>
            </td>
          </tr>
          <tr v-if="!loading && filtered.length === 0">
            <td colspan="7" class="empty" style="text-align:center">No events match the current filters.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
