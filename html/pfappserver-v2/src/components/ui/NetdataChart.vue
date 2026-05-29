<script setup>
// Inline SVG line chart driven by Netdata's /api/v1/data endpoint.
// One path per returned dimension; legend below the chart; auto-refresh
// every `refreshMs` (default 30s). Same renderer the original Status
// pages relied on dygraph + dashboard.js for — kept lightweight since
// the design dictates a flat dense style.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { authHeader } from '@/api/auth'

const props = defineProps({
  host:    { type: String, default: '/netdata/127.0.0.1' },
  metric:  { type: String, required: true },
  title:   { type: String, default: '' },
  // Optional Netdata query knobs: dimensions, filter_graph, valuerange.
  params:  { type: Object, default: () => ({}) },
  after:   { type: Number, default: -3600 },     // last hour by default
  points:  { type: Number, default: 120 },
  height:  { type: Number, default: 160 },
  refreshMs: { type: Number, default: 30000 },
})

// Stable per-dimension palette (cycles for > N dims). Uses oklch so it
// stays readable on both themes.
const PALETTE = [
  'oklch(0.72 0.16 250)',  // accent (cobalt)
  'oklch(0.74 0.16 150)',  // success
  'oklch(0.80 0.15 78)',   // warn
  'oklch(0.68 0.20 25)',   // danger
  'oklch(0.72 0.13 290)',  // info
  'oklch(0.70 0.14 200)',  // teal
  'oklch(0.75 0.14 350)',  // pink
  'oklch(0.78 0.10 100)',  // chartreuse
]

const data = ref(null)
const loading = ref(false)
const error = ref(null)
let refreshTimer = null

async function fetchData() {
  loading.value = true
  try {
    const url = new URL(`${props.host}/api/v1/data`, window.location.origin)
    url.searchParams.set('chart', props.metric)
    url.searchParams.set('after', String(props.after))
    url.searchParams.set('points', String(props.points))
    url.searchParams.set('format', 'json')
    // Netdata reverses time order by default — newest-first. We want
    // oldest-first for left-to-right rendering.
    url.searchParams.set('options', 'flip')
    if (props.params.dimensions) url.searchParams.set('dimensions', props.params.dimensions)
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...authHeader() },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    data.value = await res.json()
    error.value = null
  } catch (e) {
    error.value = e?.message || String(e)
    // Don't blow data away if a refresh fails — keep what we have.
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
  if (props.refreshMs > 0) refreshTimer = setInterval(fetchData, props.refreshMs)
})
onBeforeUnmount(() => { if (refreshTimer) clearInterval(refreshTimer) })

// Refetch when metric/dimensions/after change (e.g. tab switch with the
// same metric name but a different range).
watch(() => [props.metric, props.params.dimensions, props.after], fetchData)

// Derive SVG paths from the response. `labels[0]` is 'time', the rest
// are dimension names; each row in `data` is `[timestamp, v1, v2, ...]`.
const series = computed(() => {
  const d = data.value
  if (!d || !d.data || !d.labels || d.data.length === 0) return null
  const dims = d.labels.slice(1)
  if (dims.length === 0) return null

  // Y range across all dims, with a small floor so flat-zero charts
  // still draw at the baseline. If params.dygraph_valuerange is set
  // honour it (the original config used it for percentage charts).
  let lo, hi
  if (props.params.dygraph_valuerange) {
    try { [lo, hi] = JSON.parse(props.params.dygraph_valuerange) } catch {}
  }
  if (lo == null || hi == null) {
    let min = Infinity, max = -Infinity
    for (const row of d.data) {
      for (let i = 1; i < row.length; i++) {
        const v = row[i]
        if (typeof v === 'number' && Number.isFinite(v)) {
          if (v < min) min = v
          if (v > max) max = v
        }
      }
    }
    if (min === Infinity) { min = 0; max = 1 }
    if (min === max) { max = min + 1 }
    lo = lo ?? min
    hi = hi ?? max
  }

  const W = 600, H = props.height
  const padL = 36, padR = 8, padT = 6, padB = 18
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const xs = d.data.length
  const x = i => padL + (i / Math.max(xs - 1, 1)) * innerW
  const y = v => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return null
    return padT + innerH - ((v - lo) / (hi - lo || 1)) * innerH
  }

  const paths = dims.map((name, dimIdx) => {
    let line = ''
    let lastY = null
    for (let i = 0; i < d.data.length; i++) {
      const yv = y(d.data[i][dimIdx + 1])
      if (yv == null) { lastY = null; continue }
      line += (lastY == null ? `M${x(i).toFixed(1)},${yv.toFixed(1)}` : `L${x(i).toFixed(1)},${yv.toFixed(1)}`)
      lastY = yv
    }
    return { name, color: PALETTE[dimIdx % PALETTE.length], d: line }
  })

  const ticks = [0, 0.5, 1].map(p => ({
    y: padT + innerH * (1 - p),
    v: lo + (hi - lo) * p,
  }))

  return { paths, ticks, W, H, padL, padR }
})

function fmtNumber(v) {
  if (typeof v !== 'number') return ''
  const a = Math.abs(v)
  if (a >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 })
  if (a >= 10)   return v.toFixed(1)
  return v.toFixed(2)
}
</script>

<template>
  <div class="ndchart">
    <div v-if="title" class="ndchart-title">
      {{ title }}
      <span class="ndchart-metric mono">{{ metric }}</span>
    </div>
    <div v-if="!series && loading" class="ndchart-state">loading…</div>
    <div v-else-if="!series && error" class="ndchart-state ndchart-err">no data — {{ error }}</div>
    <div v-else-if="!series" class="ndchart-state">no data</div>
    <template v-else>
      <svg :width="'100%'" :viewBox="`0 0 ${series.W} ${series.H}`" preserveAspectRatio="none" style="display:block">
        <g>
          <line
            v-for="(t, i) in series.ticks" :key="'t'+i"
            :x1="series.padL" :x2="series.W - series.padR" :y1="t.y" :y2="t.y"
            stroke="var(--border)" stroke-dasharray="2 4"
          />
          <text
            v-for="(t, i) in series.ticks" :key="'tt'+i"
            :x="series.padL - 6" :y="t.y + 3" text-anchor="end"
            font-size="9" fill="var(--text-faint)" font-family="var(--font-mono)"
          >{{ fmtNumber(t.v) }}</text>
        </g>
        <path
          v-for="p in series.paths" :key="p.name"
          :d="p.d" fill="none" :stroke="p.color" stroke-width="1.4"
        />
      </svg>
      <div class="ndchart-legend">
        <span v-for="p in series.paths" :key="p.name" class="ndchart-leg-item">
          <span class="ndchart-leg-sw" :style="{ background: p.color }" />
          <span class="ndchart-leg-name mono">{{ p.name }}</span>
        </span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ndchart {
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 100%;
}
.ndchart-title {
  display: flex; align-items: baseline; gap: 8px;
  font-size: 12px; font-weight: 500;
}
.ndchart-metric { color: var(--text-faint); font-size: 10px; }
.ndchart-state {
  color: var(--text-faint);
  font-size: 11px;
  font-family: var(--font-mono);
  padding: 28px 0;
  text-align: center;
}
.ndchart-err { color: var(--warn); }
.ndchart-legend {
  display: flex; flex-wrap: wrap; gap: 10px;
  font-size: 10px; color: var(--text-dim);
}
.ndchart-leg-item { display: inline-flex; align-items: center; gap: 5px; }
.ndchart-leg-sw { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
.ndchart-leg-name { color: var(--text-mid); }
</style>
