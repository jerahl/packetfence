<script setup>
// Force-directed network graph — pure-SVG with a small custom physics
// step (no d3-force or vis.js dependency). Renders the same topology
// the v1 admin's /admin/status/assets surfaced via
// POST /api/v1/nodes/network_graph: a central PacketFence node, switch
// groups / switches around it, endpoints clustered under each switch.
//
// Inputs:
//   nodes: [{ id, type, label?, status?, mac?, ... }]
//     - `type` is 'packetfence' | 'switch-group' | 'switch' | 'unknown' | 'node'
//   links: [{ source, target }]  (string ids)
//   height: SVG height in CSS px (default 520)
//
// Interactions: drag to pan, wheel to zoom, hover for tooltip,
// click an endpoint node to open the shared inspector.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useUiStore } from '@/stores/ui'

const props = defineProps({
  nodes:  { type: Array, default: () => [] },
  links:  { type: Array, default: () => [] },
  height: { type: Number, default: 520 },
  // Total simulation ticks to run on (re)load. ~250-400 is plenty for
  // the kind of star/cluster topology PF produces; bumping this only
  // costs JS at mount, not at render.
  ticks:  { type: Number, default: 320 },
})

const ui = useUiStore()

// Per-type visual scale. Larger nodes (PF, switches) sit lower in the
// repulsion/spring tuning so endpoints cluster around them. The radius
// also drives the SVG glyph size.
function nodeRadius(t) {
  if (t === 'packetfence')  return 18
  if (t === 'switch-group') return 13
  if (t === 'switch')       return 11
  if (t === 'unknown')      return 9
  return 5 // endpoint
}
function nodeColor(n) {
  if (n.type === 'packetfence')  return 'var(--accent)'
  if (n.type === 'switch-group') return 'var(--info)'
  if (n.type === 'switch')       return 'var(--info)'
  if (n.type === 'unknown')      return 'var(--text-dim)'
  // endpoint — colour by status
  switch (n.status) {
    case 'registered':   return 'var(--success)'
    case 'pending':      return 'var(--info)'
    case 'unregistered': return 'var(--warn)'
    case 'isolated':     return 'var(--danger)'
    default:             return 'var(--text-mid)'
  }
}

// Internal simulation state — a deep copy of nodes + a link list using
// node references so we don't mutate the prop objects.
const sim = ref({ nodes: [], links: [], bbox: { x: 0, y: 0, w: 1000, h: 600 } })

// View state — viewBox-driven pan/zoom.
const view = ref({ x: 0, y: 0, w: 1000, h: 600 })

const hover = ref(null)        // { node, sx, sy } in screen coords for the tooltip
const isDragging = ref(false)
const svgEl = ref(null)

function buildSimulation() {
  const W = 1000, H = 600
  // Map id → node copy. Lay out initially in a circle so the simulation
  // starts from a non-degenerate state. PF goes in the dead centre.
  const byId = new Map()
  const N = props.nodes.length || 1
  props.nodes.forEach((n, i) => {
    let x, y
    if (n.type === 'packetfence') { x = W / 2; y = H / 2 }
    else {
      const angle = (i / N) * Math.PI * 2
      const r = Math.min(W, H) * 0.35
      x = W / 2 + r * Math.cos(angle)
      y = H / 2 + r * Math.sin(angle)
    }
    byId.set(n.id, { ...n, x, y, vx: 0, vy: 0, r: nodeRadius(n.type) })
  })
  const nodes = [...byId.values()]

  // Links carry references to the live node objects so the simulation
  // can read/write positions cheaply. Drop dangling links silently.
  const links = []
  for (const l of props.links) {
    const a = byId.get(l.source)
    const b = byId.get(l.target)
    if (a && b) links.push({ source: a, target: b })
  }

  // Tuned constants — picked empirically to give an ops-console-style
  // graph (tight clusters, readable spacing) for ~50-200 nodes.
  const REPEL  = 6000   // node-node repulsion
  const SPRING = 0.04   // link spring constant
  const REST   = 90     // link resting length
  const CENTRE = 0.005  // pull toward the centre
  const DAMP   = 0.85

  for (let step = 0; step < props.ticks; step++) {
    // Repulsion (O(n²); fine for the sizes we're dealing with).
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i]
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j]
        const dx = b.x - a.x, dy = b.y - a.y
        let d2 = dx * dx + dy * dy
        if (d2 < 1) d2 = 1
        const f = REPEL / d2
        const d = Math.sqrt(d2)
        const fx = (f * dx) / d, fy = (f * dy) / d
        a.vx -= fx; a.vy -= fy
        b.vx += fx; b.vy += fy
      }
    }
    // Springs
    for (const l of links) {
      const a = l.source, b = l.target
      const dx = b.x - a.x, dy = b.y - a.y
      const d = Math.sqrt(dx * dx + dy * dy) || 1
      const f = SPRING * (d - REST)
      const fx = (f * dx) / d, fy = (f * dy) / d
      a.vx += fx; a.vy += fy
      b.vx -= fx; b.vy -= fy
    }
    // Centering + damping + integration
    for (const n of nodes) {
      if (n.type === 'packetfence') { n.vx = 0; n.vy = 0; continue } // pin PF
      n.vx = (n.vx - n.x * CENTRE + W / 2 * CENTRE) * DAMP
      n.vy = (n.vy - n.y * CENTRE + H / 2 * CENTRE) * DAMP
      n.x += n.vx
      n.y += n.vy
    }
  }

  // Compute bbox so the view auto-fits the laid-out graph.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const n of nodes) {
    if (n.x < minX) minX = n.x
    if (n.y < minY) minY = n.y
    if (n.x > maxX) maxX = n.x
    if (n.y > maxY) maxY = n.y
  }
  const pad = 60
  const bbox = {
    x: minX - pad,
    y: minY - pad,
    w: Math.max(maxX - minX + pad * 2, 200),
    h: Math.max(maxY - minY + pad * 2, 200),
  }
  sim.value = { nodes, links, bbox }
  view.value = { ...bbox }
}

watch(() => [props.nodes, props.links], buildSimulation, { immediate: false, deep: false })
onMounted(buildSimulation)

// --- Pan & zoom -----------------------------------------------------
let panStart = null
function onMouseDown(e) {
  if (e.button !== 0) return
  isDragging.value = true
  panStart = { x: e.clientX, y: e.clientY, vx: view.value.x, vy: view.value.y }
}
function onMouseMove(e) {
  if (!isDragging.value || !panStart) return
  const rect = svgEl.value.getBoundingClientRect()
  // Translate screen-px delta into viewBox units so panning is 1:1
  // with the cursor regardless of zoom level.
  const scale = view.value.w / rect.width
  view.value = {
    ...view.value,
    x: panStart.vx - (e.clientX - panStart.x) * scale,
    y: panStart.vy - (e.clientY - panStart.y) * scale,
  }
}
function onMouseUp() { isDragging.value = false; panStart = null }
function onWheel(e) {
  e.preventDefault()
  const rect = svgEl.value.getBoundingClientRect()
  // Zoom around the cursor: translate first so the cursor's
  // viewBox-coord position stays fixed during the scale.
  const cx = ((e.clientX - rect.left) / rect.width) * view.value.w + view.value.x
  const cy = ((e.clientY - rect.top) / rect.height) * view.value.h + view.value.y
  const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15
  const w = Math.min(Math.max(view.value.w * factor, 100), 5000)
  const h = Math.min(Math.max(view.value.h * factor, 100), 5000)
  view.value = {
    x: cx - ((e.clientX - rect.left) / rect.width) * w,
    y: cy - ((e.clientY - rect.top) / rect.height) * h,
    w,
    h,
  }
}
function fitView() {
  view.value = { ...sim.value.bbox }
}

// --- Hover & click --------------------------------------------------
function onNodeEnter(node, e) {
  if (isDragging.value) return
  const rect = svgEl.value.getBoundingClientRect()
  hover.value = { node, sx: e.clientX - rect.left, sy: e.clientY - rect.top }
}
function onNodeLeave() { hover.value = null }
function onNodeClick(node) {
  if (node.type !== 'node') return
  // The original prop nodes may carry a `_endpoint` reference (the
  // full v2 endpoint record). If so, open it; otherwise build a
  // minimal stub so the drawer still opens with what we have.
  ui.openInspector(node._endpoint || {
    id: node.id, mac: node.mac, hostname: node.label || node.mac,
    status: node.status, owner: '—', role: '—', vlan: '—',
    switch: '—', port: '—', ssid: '—', type: 'Laptop',
    os: '—', vendor: '—', ip: '—', bandwidth: 0, registered: '—',
  })
}

// Bind to window so a drag that releases outside the SVG still ends.
onMounted(() => {
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('mousemove', onMouseMove)
})
onBeforeUnmount(() => {
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('mousemove', onMouseMove)
})

const viewBox = computed(() => `${view.value.x} ${view.value.y} ${view.value.w} ${view.value.h}`)
// Inverse zoom so stroke widths render at a consistent screen weight
// regardless of how zoomed-in the user is.
const zoomScale = computed(() => view.value.w / sim.value.bbox.w || 1)
const strokeScale = computed(() => Math.max(0.5, zoomScale.value))

// Cheap counter — drives a "no graph" placeholder.
const isEmpty = computed(() => (sim.value.nodes?.length || 0) === 0)
</script>

<template>
  <div class="node-graph" :style="{ height: height + 'px' }">
    <div class="node-graph-toolbar">
      <div class="node-graph-legend">
        <span class="lg"><span class="dot" style="background: var(--accent)"></span> PacketFence</span>
        <span class="lg"><span class="dot" style="background: var(--info)"></span> Switch</span>
        <span class="lg"><span class="dot" style="background: var(--success)"></span> Registered</span>
        <span class="lg"><span class="dot" style="background: var(--info)"></span> Pending</span>
        <span class="lg"><span class="dot" style="background: var(--warn)"></span> Unregistered</span>
        <span class="lg"><span class="dot" style="background: var(--danger)"></span> Isolated</span>
      </div>
      <button class="btn sm" @click="fitView">Fit</button>
    </div>
    <svg
      ref="svgEl"
      :viewBox="viewBox"
      preserveAspectRatio="xMidYMid meet"
      class="node-graph-svg"
      :class="{ dragging: isDragging }"
      @mousedown="onMouseDown"
      @wheel.passive="onWheel"
    >
      <!-- Links first so nodes paint on top -->
      <g class="links" :stroke-width="1 / strokeScale">
        <line
          v-for="(l, i) in sim.links" :key="i"
          :x1="l.source.x" :y1="l.source.y"
          :x2="l.target.x" :y2="l.target.y"
          stroke="var(--border-strong)"
          stroke-opacity="0.55"
        />
      </g>
      <!-- Nodes -->
      <g class="nodes">
        <g
          v-for="n in sim.nodes" :key="n.id"
          :transform="`translate(${n.x},${n.y})`"
          :class="['node', `node-${n.type}`, { hovered: hover && hover.node.id === n.id }]"
          @mouseenter="onNodeEnter(n, $event)"
          @mousemove="onNodeEnter(n, $event)"
          @mouseleave="onNodeLeave"
          @click="onNodeClick(n)"
        >
          <!-- PF + switches use rounded squares; endpoints/unknowns are circles -->
          <rect
            v-if="n.type === 'switch' || n.type === 'switch-group' || n.type === 'packetfence'"
            :x="-n.r" :y="-n.r" :width="n.r * 2" :height="n.r * 2"
            rx="3" ry="3"
            :fill="nodeColor(n)"
            :fill-opacity="n.type === 'packetfence' ? 0.95 : 0.85"
            :stroke="hover && hover.node.id === n.id ? 'var(--text)' : 'var(--bg)'"
            :stroke-width="1.5 / strokeScale"
          />
          <circle
            v-else
            :r="n.r"
            :fill="nodeColor(n)"
            :fill-opacity="0.95"
            :stroke="hover && hover.node.id === n.id ? 'var(--text)' : 'var(--bg)'"
            :stroke-width="1.5 / strokeScale"
          />
        </g>
      </g>
    </svg>

    <!-- Hover tooltip — positioned in screen coords so it doesn't
         scale with zoom and stays legible. -->
    <div
      v-if="hover"
      class="node-graph-tip"
      :style="{ left: (hover.sx + 12) + 'px', top: (hover.sy + 12) + 'px' }"
    >
      <div class="node-graph-tip-h">
        <span class="dot" :style="{ background: nodeColor(hover.node) }"></span>
        <span class="mono">{{ hover.node.id }}</span>
        <span class="tip-type">{{ hover.node.type }}</span>
      </div>
      <div v-if="hover.node.label || hover.node.mac" class="node-graph-tip-row">
        <span class="k">name</span>
        <span class="v mono">{{ hover.node.label || hover.node.mac }}</span>
      </div>
      <div v-if="hover.node.status" class="node-graph-tip-row">
        <span class="k">status</span>
        <span class="v">{{ hover.node.status }}</span>
      </div>
      <div v-if="hover.node.type === 'node'" class="node-graph-tip-hint">click to inspect</div>
    </div>

    <div v-if="isEmpty" class="node-graph-empty">No graph data available.</div>
  </div>
</template>

<style scoped>
.node-graph {
  position: relative;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  user-select: none;
}
.node-graph-toolbar {
  position: absolute;
  top: 8px; left: 10px; right: 10px;
  display: flex; align-items: center; gap: 10px;
  z-index: 2;
  pointer-events: none;
}
.node-graph-toolbar .btn { pointer-events: auto; }
.node-graph-legend {
  display: flex; gap: 12px;
  flex-wrap: wrap;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 6px 10px;
  font-size: 10px;
  color: var(--text-dim);
  pointer-events: auto;
}
.lg { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.node-graph-svg {
  width: 100%; height: 100%;
  cursor: grab;
}
.node-graph-svg.dragging { cursor: grabbing; }
.node .node-node { cursor: pointer; }
.node:hover { filter: brightness(1.1); }
.node-node { cursor: pointer; }
.node-graph-tip {
  position: absolute;
  pointer-events: none;
  z-index: 3;
  background: var(--bg-elev);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 8px 10px;
  font-size: 11px;
  min-width: 180px;
  max-width: 280px;
}
.node-graph-tip-h { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.node-graph-tip-h .tip-type {
  margin-left: auto;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 9px;
}
.node-graph-tip-row { display: flex; gap: 8px; padding: 2px 0; }
.node-graph-tip-row .k { color: var(--text-dim); width: 50px; }
.node-graph-tip-row .v { color: var(--text); }
.node-graph-tip-hint { margin-top: 4px; color: var(--text-faint); font-size: 10px; font-style: italic; }
.node-graph-empty {
  position: absolute; inset: 0;
  display: grid; place-items: center;
  color: var(--text-faint);
  font-size: 12px;
}
</style>
