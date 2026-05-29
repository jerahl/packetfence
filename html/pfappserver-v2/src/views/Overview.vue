<script setup>
import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'
import { NAC_DATA, deviceIcon } from '@/data/mock'
import { nodesApi } from '@/api/nodes'
import { eventsApi } from '@/api/events'
import { useResource } from '@/composables/useResource'
import Icon from '@/components/Icon.vue'
import SparkArea from '@/components/ui/SparkArea.vue'
import AreaChart from '@/components/ui/AreaChart.vue'
import Donut from '@/components/ui/Donut.vue'
import StatusChip from '@/components/ui/StatusChip.vue'

const ui = useUiStore()

// KPI sparklines, the 24h chart, the posture donut and the switch-health
// list stay on the mock for now — those endpoints need either a dedicated
// /dashboard summary route or the Netdata /api/v1/data series, both of
// which land in follow-ups.
const auth   = computed(() => NAC_DATA.trend.slice(-48).map(t => t.active))
const denied = computed(() => NAC_DATA.trend.slice(-48).map(t => t.denied))
const regsHist = [12, 18, 15, 22, 19, 28, 31, 26, 34, 29, 38, 42, 36, 45]
const isoHist  = [2, 1, 3, 4, 2, 1, 5, 3, 2, 4, 3, 6, 4, 7]

const dist = [
  { name: 'Registered',   v: 2384, color: 'var(--success)' },
  { name: 'Pending',      v: 197,  color: 'var(--warn)' },
  { name: 'Unregistered', v: 232,  color: 'var(--text-dim)' },
  { name: 'Isolated',     v: 34,   color: 'var(--danger)' },
]
const totalEp = dist.reduce((s, d) => s + d.v, 0)

// Two live panels — recent endpoints and open security events. Both fall
// back to mock when the API is unreachable so the page still renders in
// dev without a backend.
const { data: topNodes } = useResource(
  () => nodesApi.list({ limit: 6 }).then(r => r.items),
  { fallback: NAC_DATA.nodes.slice(0, 6) },
)
const { data: recentEvents } = useResource(
  () => eventsApi.listOpen({ limit: 5 }),
  { fallback: NAC_DATA.events.slice(0, 5) },
)

function severityChipClass(s) {
  return s === 'critical' || s === 'high' ? 'bad' : s === 'medium' ? 'warn' : 'info'
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">Overview</div>
        <div class="page-sub">Live status across 7 switches · last 24h · realtime</div>
      </div>
      <div class="page-tools">
        <div class="segmented">
          <button>1h</button>
          <button class="on">24h</button>
          <button>7d</button>
          <button>30d</button>
        </div>
        <button class="btn"><Icon name="refresh" :size="13" /> Refresh</button>
        <button class="btn primary"><Icon name="plus" :size="13" /> Register endpoint</button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label"><Icon name="endpoints" :size="12" /> Active endpoints</div>
        <div class="kpi-value num">2,847<span class="unit">/ 3,200</span></div>
        <div class="kpi-delta"><span class="up">▲ 4.2%</span> vs yesterday</div>
        <div class="kpi-spark"><SparkArea :data="auth" /></div>
      </div>
      <div class="kpi">
        <div class="kpi-label"><Icon name="signal" :size="12" /> Auth requests / min</div>
        <div class="kpi-value num">418</div>
        <div class="kpi-delta"><span class="up">▲ 12%</span> · 99.4% accepted</div>
        <div class="kpi-spark"><SparkArea :data="denied" color="var(--info)" fillColor="var(--info-soft)" /></div>
      </div>
      <div class="kpi">
        <div class="kpi-label"><Icon name="user" :size="12" /> Registrations today</div>
        <div class="kpi-value num">42</div>
        <div class="kpi-delta"><span class="up">▲ 18</span> · 6 BYOD, 36 corp</div>
        <div class="kpi-spark"><SparkArea :data="regsHist" color="var(--success)" fillColor="var(--success-soft)" /></div>
      </div>
      <div class="kpi">
        <div class="kpi-label"><Icon name="alert" :size="12" /> Security events (open)</div>
        <div class="kpi-value num">8<span class="unit">2 critical</span></div>
        <div class="kpi-delta"><span class="down">▲ 3</span> vs 24h avg</div>
        <div class="kpi-spark"><SparkArea :data="isoHist" color="var(--danger)" fillColor="var(--danger-soft)" /></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">Authentication traffic</div>
            <div class="card-sub">Accepted vs denied · last 24h · 5-min buckets</div>
          </div>
          <div class="card-tools">
            <div class="chart-legend" style="padding:0">
              <span><span class="swatch" style="background:var(--accent)" />Accepted</span>
              <span><span class="swatch" style="background:var(--danger)" />Denied ×6</span>
            </div>
            <button class="btn sm ghost"><Icon name="more" :size="13" /></button>
          </div>
        </div>
        <div class="chart-wrap">
          <AreaChart :data="NAC_DATA.trend" />
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">Endpoint posture</div>
            <div class="card-sub">{{ totalEp.toLocaleString() }} total</div>
          </div>
        </div>
        <div class="card-body" style="display:flex; gap:18px; align-items:center">
          <Donut :data="dist" :size="140" />
          <div class="donut-legend" style="flex:1">
            <div v-for="d in dist" :key="d.name" class="lg-row">
              <span class="sw" :style="{ background: d.color }" />
              <span class="lg-name">{{ d.name }}</span>
              <span class="lg-val">{{ d.v.toLocaleString() }}</span>
              <span class="lg-pct">{{ Math.round(d.v / totalEp * 100) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-head">
          <div class="card-title">Open security events</div>
          <div class="card-sub">Tap to inspect</div>
          <div class="card-tools">
            <button class="btn sm ghost">View all <Icon name="chevR" :size="12" /></button>
          </div>
        </div>
        <div class="activity">
          <div
            v-for="e in recentEvents" :key="e.id"
            class="activity-row"
            style="cursor:pointer"
            @click="ui.openInspector(e.node)"
          >
            <Icon name="alert" class="ico" />
            <div style="min-width:0">
              <div style="display:flex; align-items:center; gap:8px">
                <span class="who">{{ e.rule }}</span>
                <span :class="['chip', severityChipClass(e.severity)]">{{ e.severity }}</span>
              </div>
              <div style="color:var(--text-dim); font-size:11px; margin-top:2px">
                <span class="mono">{{ e.node.mac }}</span> · {{ e.desc }}
              </div>
            </div>
            <span class="ts">{{ e.time }}</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div class="card-title">Switch health</div>
          <div class="card-sub">7 devices · 1 degraded</div>
          <div class="card-tools">
            <button class="btn sm ghost"><Icon name="more" :size="13" /></button>
          </div>
        </div>
        <div class="health-list">
          <div v-for="s in NAC_DATA.switches" :key="s.name" class="health-row">
            <Icon name="switch" />
            <div style="flex:1; min-width:0">
              <div class="name mono">{{ s.name }}</div>
              <div class="meta">{{ s.model }} · {{ s.sessions }} sessions · {{ s.role }}</div>
            </div>
            <div style="width:100px">
              <div class="bar">
                <span :style="{
                  width: s.health + '%',
                  background: s.health > 85 ? 'var(--success)' : s.health > 60 ? 'var(--warn)' : 'var(--danger)'
                }" />
              </div>
              <div class="meta" style="text-align:right; margin-top:2px">{{ s.health }}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <div class="card-title">Recent endpoints</div>
        <div class="card-sub">Last 6 to connect</div>
        <div class="card-tools">
          <router-link :to="{ name: 'endpoints' }" class="btn sm ghost" style="text-decoration:none">
            View all endpoints <Icon name="chevR" :size="12" />
          </router-link>
        </div>
      </div>
      <div style="overflow-x:auto">
        <table class="tbl">
          <thead>
            <tr>
              <th>Device</th>
              <th>MAC</th>
              <th>User</th>
              <th>Role</th>
              <th>SSID / Port</th>
              <th>Switch</th>
              <th>Last seen</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="n in topNodes" :key="n.id" @click="ui.openInspector(n)">
              <td>
                <span style="display:inline-flex; align-items:center; gap:8px">
                  <Icon :name="deviceIcon(n.type)" />
                  <span class="mono">{{ n.hostname }}</span>
                </span>
              </td>
              <td class="mono">{{ n.mac }}</td>
              <td>{{ n.owner }}</td>
              <td>
                <span class="chip accent">{{ n.role }}<span style="opacity:0.6"> · v{{ n.vlan }}</span></span>
              </td>
              <td class="mono">{{ n.ssid }} · {{ n.port }}</td>
              <td class="mono" style="color:var(--text-dim)">{{ n.switch }}</td>
              <td class="mono" style="color:var(--text-dim)">{{ n.lastSeen }}</td>
              <td><StatusChip :status="n.status" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
