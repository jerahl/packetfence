<script setup>
// Status > Services — PacketFence service management. Mirrors the v1
// /admin/status/services table: every PF service with its run state, plus
// start / stop / restart / enable / disable controls.
//
//   GET  /api/v1/services/status_all  -> [{ id, alive, managed, enabled, pid }]
//   POST /api/v1/service/<id>/<action>
//
// Single-node (no cluster fan-out yet, like the rest of the v2 app). Polls
// every 20s and after every action so the table reflects reality; degrades
// to mock service statuses via useResource's fallback.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { servicesApi } from '@/api/services'
import { useResource } from '@/composables/useResource'
import { MOCK_SERVICES } from '@/data/mock'
import Icon from '@/components/Icon.vue'

const q = ref('')
const selectedStates = ref(new Set())   // running | stopped | disabled
const busy = ref(new Set())             // service ids with an action in flight

const { data: services, loading, refresh } = useResource(
  () => servicesApi.statusAll(),
  { fallback: MOCK_SERVICES },
)

// Keep the table live; service state changes out-of-band (cron, crashes).
let timer = null
onMounted(() => { timer = setInterval(refresh, 20000) })
onBeforeUnmount(() => { if (timer) clearInterval(timer) })

function stateOf(s) {
  if (s.alive) return 'running'
  if (s.managed) return 'stopped'
  return 'disabled'
}
function stateChip(state) {
  return state === 'running' ? 'ok' : state === 'stopped' ? 'bad' : ''
}

const STATES = ['running', 'stopped', 'disabled']
const counts = computed(() => {
  const list = services.value || []
  return {
    total: list.length,
    running: list.filter(s => stateOf(s) === 'running').length,
    stopped: list.filter(s => stateOf(s) === 'stopped').length,
    disabled: list.filter(s => stateOf(s) === 'disabled').length,
  }
})

const hasFilters = computed(() => q.value.trim() !== '' || selectedStates.value.size > 0)
const filtered = computed(() => {
  let list = (services.value || []).slice().sort((a, b) => a.id.localeCompare(b.id))
  if (selectedStates.value.size) list = list.filter(s => selectedStates.value.has(stateOf(s)))
  const query = q.value.trim().toLowerCase()
  if (query) list = list.filter(s => s.id.toLowerCase().includes(query))
  return list
})

function toggleState(state) {
  const next = new Set(selectedStates.value)
  next.has(state) ? next.delete(state) : next.add(state)
  selectedStates.value = next
}
function clearFilters() { q.value = ''; selectedStates.value = new Set() }
function setKpiFilter(state) {
  selectedStates.value = selectedStates.value.has(state) && selectedStates.value.size === 1
    ? new Set() : new Set([state])
}

async function doAction(svc, action) {
  if (busy.value.has(svc.id)) return
  busy.value = new Set([...busy.value, svc.id])
  try {
    await servicesApi.action(svc.id, action)
    await refresh()
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[Services] ${action} ${svc.id} failed:`, e?.message || e)
  } finally {
    const next = new Set(busy.value)
    next.delete(svc.id)
    busy.value = next
  }
}
</script>

<template>
  <div class="page" style="max-width: 1280px">
    <div class="page-head">
      <div>
        <div class="page-title">Services</div>
        <div class="page-sub">
          PacketFence services · <span class="mono">/api/v1/services/status_all</span>
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
        <div class="kpi-label"><Icon name="switch" :size="12" /> Services</div>
        <div class="kpi-value num">{{ counts.total }}</div>
        <div class="kpi-delta">managed units</div>
      </div>
      <div class="kpi" style="cursor:pointer" :class="{ active: selectedStates.has('running') }" @click="setKpiFilter('running')">
        <div class="kpi-label"><span class="dot" style="background:var(--success)"></span> Running</div>
        <div class="kpi-value num">{{ counts.running }}</div>
        <div class="kpi-delta">alive</div>
      </div>
      <div class="kpi" style="cursor:pointer" :class="{ active: selectedStates.has('stopped') }" @click="setKpiFilter('stopped')">
        <div class="kpi-label"><span class="dot" style="background:var(--danger)"></span> Stopped</div>
        <div class="kpi-value num">{{ counts.stopped }}</div>
        <div class="kpi-delta">managed but down</div>
      </div>
      <div class="kpi" style="cursor:pointer" :class="{ active: selectedStates.has('disabled') }" @click="setKpiFilter('disabled')">
        <div class="kpi-label"><span class="dot" style="background:var(--text-faint)"></span> Disabled</div>
        <div class="kpi-value num">{{ counts.disabled }}</div>
        <div class="kpi-delta">not managed</div>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="card svc-filters">
      <div class="tbl-search" style="flex:1; max-width:360px">
        <Icon name="search" />
        <input v-model="q" placeholder="Filter services…" />
        <button v-if="q" class="btn sm ghost" @click="q = ''" title="Clear"><Icon name="x" :size="12" /></button>
      </div>
      <div class="svc-chips">
        <span class="svc-chip-label">Status</span>
        <button v-for="s in STATES" :key="s" type="button"
                :class="['chip', selectedStates.has(s) ? stateChip(s) || 'accent' : '']" style="cursor:pointer"
                @click="toggleState(s)">{{ s }}</button>
      </div>
      <button v-if="hasFilters" class="btn sm ghost" style="margin-left:auto" @click="clearFilters">
        <Icon name="x" :size="12" /> Clear filters
      </button>
    </div>

    <!-- Table -->
    <div class="tbl-wrap">
      <div class="tbl-toolbar">
        <span style="font-size:12px; color:var(--text-dim)">
          Showing <b class="num">{{ filtered.length }}</b>
          <template v-if="hasFilters">of {{ (services || []).length }}</template>
          service{{ filtered.length === 1 ? '' : 's' }}
        </span>
      </div>
      <table class="tbl">
        <thead>
          <tr>
            <th>Service</th>
            <th>Status</th>
            <th>Enabled</th>
            <th>PID</th>
            <th class="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in filtered" :key="s.id">
            <td><span class="mono" style="font-weight:500">{{ s.id }}</span></td>
            <td>
              <span :class="['chip', stateChip(stateOf(s))]">
                <span v-if="stateOf(s) === 'running'" class="dot" style="background:var(--success); margin-right:5px"></span>{{ stateOf(s) }}
              </span>
            </td>
            <td>
              <span :class="['chip', s.enabled ? 'ok' : '']">{{ s.enabled ? 'enabled' : 'disabled' }}</span>
            </td>
            <td class="mono" style="color:var(--text-dim)">{{ s.pid || '—' }}</td>
            <td class="actions-col">
              <div class="svc-actions">
                <template v-if="busy.has(s.id)">
                  <span class="mono" style="font-size:11px; color:var(--text-faint)">working…</span>
                </template>
                <template v-else>
                  <button v-if="!s.alive" class="btn sm" @click="doAction(s, 'start')" title="Start">
                    <Icon name="bolt" :size="12" /> Start
                  </button>
                  <button v-if="s.alive" class="btn sm" @click="doAction(s, 'restart')" title="Restart">
                    <Icon name="refresh" :size="12" /> Restart
                  </button>
                  <button v-if="s.alive" class="btn sm danger" @click="doAction(s, 'stop')" title="Stop">
                    <Icon name="ban" :size="12" /> Stop
                  </button>
                  <button class="btn sm ghost" @click="doAction(s, s.enabled ? 'disable' : 'enable')"
                          :title="s.enabled ? 'Disable at boot' : 'Enable at boot'">
                    {{ s.enabled ? 'Disable' : 'Enable' }}
                  </button>
                </template>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && filtered.length === 0">
            <td colspan="5" class="empty" style="text-align:center">No services match the current filters.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.kpi.active { outline: 1px solid var(--accent); }

.svc-filters { margin-bottom: 14px; padding: 10px 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.svc-chip-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-faint); font-weight: 600; margin-right: 2px; }
.svc-chips { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.svc-filters .chip { cursor: pointer; }
.svc-filters .chip:hover { background: var(--bg-hover); color: var(--text); }

.svc-actions { display: flex; gap: 6px; justify-content: flex-end; flex-wrap: wrap; }
.actions-col { text-align: right; white-space: nowrap; }
</style>
