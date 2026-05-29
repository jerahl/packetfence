<script setup>
// Status > Monitoring — mirrors /admin/status/monitoring/<host> from the
// old Vue 2 admin. Section tabs (System, RADIUS, Apache, …) along the top;
// each section's groups render as cards with a 12-column chart grid.
// Each chart is a NetdataChart that polls /api/v1/data and auto-refreshes.
import { computed, ref } from 'vue'
import { MONITORING_SECTIONS } from '@/data/monitoringConfig'
import Icon from '@/components/Icon.vue'
import NetdataChart from '@/components/ui/NetdataChart.vue'

const sections = MONITORING_SECTIONS
const activeIdx = ref(0)
const active = computed(() => sections[activeIdx.value])

// 'Show last' time range — drives `after` (in seconds) on every chart.
const PERIODS = [
  { text: '5m',  value: -60 * 5,        title: '5 minutes' },
  { text: '15m', value: -60 * 15,       title: '15 minutes' },
  { text: '1h',  value: -60 * 60,       title: '1 hour' },
  { text: '6h',  value: -60 * 60 * 6,   title: '6 hours' },
  { text: '24h', value: -60 * 60 * 24,  title: '24 hours' },
  { text: '7d',  value: -60 * 60 * 24 * 7, title: '7 days' },
]
const after = ref(-3600)

// Host the charts query. The reverse-proxy path /netdata/<ip>/ is
// what the existing pages used too; 127.0.0.1 is this node. Multi-node
// host selection lands when /cluster servers is wired in v2.
const host = '/netdata/127.0.0.1'

// Bootstrap-style 12-col widths — kept identical to the Vue 2 grid so
// the layout matches the original page exactly. `cols=12` spans full width.
function colClass(cols) {
  return `mon-col mon-col-${Math.min(Math.max(cols ?? 6, 1), 12)}`
}
</script>

<template>
  <div class="page" style="max-width: 1600px">
    <div class="page-head">
      <div>
        <div class="page-title">Monitoring</div>
        <div class="page-sub">Netdata · live system, services and PacketFence metrics</div>
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
        <a :href="`${host}/`" target="_blank" class="btn" style="text-decoration:none">
          <Icon name="globe" :size="13" /> Open in Netdata
        </a>
      </div>
    </div>

    <div class="tabs">
      <div
        v-for="(s, i) in sections" :key="s.name"
        :class="['t', { active: activeIdx === i }]"
        @click="activeIdx = i"
      >{{ s.name }}</div>
    </div>

    <div v-for="group in active.groups" :key="group.name" class="card mon-group">
      <div class="card-head">
        <div class="card-title">{{ group.name }}</div>
        <div class="card-sub">{{ group.items.length }} chart{{ group.items.length === 1 ? '' : 's' }}</div>
      </div>
      <div class="card-body mon-grid">
        <div
          v-for="(chart, i) in group.items" :key="`${group.name}-${i}-${chart.metric}`"
          :class="colClass(chart.cols)"
        >
          <NetdataChart
            :host="host"
            :metric="chart.metric"
            :title="chart.title"
            :params="chart.params || {}"
            :after="after"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mon-group { margin-bottom: 14px; }
.mon-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 12px;
}
/* Bootstrap-equivalent col widths so the original cols numbers map 1:1. */
.mon-col-1  { grid-column: span 1; }
.mon-col-2  { grid-column: span 2; }
.mon-col-3  { grid-column: span 3; }
.mon-col-4  { grid-column: span 4; }
.mon-col-5  { grid-column: span 5; }
.mon-col-6  { grid-column: span 6; }
.mon-col-7  { grid-column: span 7; }
.mon-col-8  { grid-column: span 8; }
.mon-col-9  { grid-column: span 9; }
.mon-col-10 { grid-column: span 10; }
.mon-col-11 { grid-column: span 11; }
.mon-col-12 { grid-column: span 12; }
/* Stack to two columns on narrow viewports — keeps the page useable
   even when the sidebar is open on small screens. */
@media (max-width: 1100px) {
  .mon-grid { grid-template-columns: repeat(6, 1fr); }
  .mon-col-1,.mon-col-2,.mon-col-3 { grid-column: span 3; }
  .mon-col-4,.mon-col-5 { grid-column: span 3; }
  .mon-col-6,.mon-col-7,.mon-col-8 { grid-column: span 6; }
  .mon-col-9,.mon-col-10,.mon-col-11,.mon-col-12 { grid-column: span 6; }
}
</style>
