<script setup>
import { computed, useId } from 'vue'

// 24h auth-traffic chart — port of the design's AreaChart.
// `denied` is multiplied by `deniedScale` so its area is visible against
// the much larger `active` series; the legend says "Denied ×6".
const props = defineProps({
  data: { type: Array, required: true },
  height: { type: Number, default: 220 },
  deniedScale: { type: Number, default: 6 },
})

const uid = useId()
const gradA = 'gA-' + uid
const gradD = 'gD-' + uid

const W = 760
const padL = 36, padR = 12, padT = 12, padB = 26

const built = computed(() => {
  const data = props.data
  const h = props.height
  const innerW = W - padL - padR
  const innerH = h - padT - padB
  const maxA = Math.max(...data.map(d => d.active))
  const maxD = Math.max(...data.map(d => d.denied))
  const maxV = Math.max(maxA, maxD * props.deniedScale)
  const x = i => padL + (i / (data.length - 1)) * innerW
  const y = v => padT + innerH - (v / maxV) * innerH

  const build = (key, scale = 1) => {
    const pts = data.map((d, i) => [x(i), y(d[key] * scale)])
    const line = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')
    const area = line + ` L${padL + innerW},${padT + innerH} L${padL},${padT + innerH} Z`
    return { line, area }
  }

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(p => ({
    y: padT + innerH * (1 - p),
    v: Math.round(maxV * p),
  }))
  const xLabelIdx = [0, 48, 96, 144, 192, 240, 287]
  const xLabelTxt = ['00', '04', '08', '12', '16', '20', '24']
  const xLabels = xLabelIdx.map((i, k) => ({ x: x(Math.min(i, data.length - 1)), label: xLabelTxt[k] }))

  return {
    h,
    a: build('active'),
    d: build('denied', props.deniedScale),
    ticks,
    xLabels,
  }
})
</script>

<template>
  <svg :width="'100%'" :viewBox="`0 0 ${W} ${built.h}`" preserveAspectRatio="none" style="display:block">
    <defs>
      <linearGradient :id="gradA" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--accent)" stop-opacity="0.32" />
        <stop offset="1" stop-color="var(--accent)" stop-opacity="0" />
      </linearGradient>
      <linearGradient :id="gradD" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--danger)" stop-opacity="0.22" />
        <stop offset="1" stop-color="var(--danger)" stop-opacity="0" />
      </linearGradient>
    </defs>
    <g v-for="(t, i) in built.ticks" :key="'t'+i">
      <line :x1="padL" :x2="W - padR" :y1="t.y" :y2="t.y" stroke="var(--border)" stroke-dasharray="2 4" />
      <text :x="padL - 6" :y="t.y + 3" text-anchor="end" font-size="9" fill="var(--text-faint)" font-family="var(--font-mono)">{{ t.v.toLocaleString() }}</text>
    </g>
    <text v-for="(l, i) in built.xLabels" :key="'x'+i" :x="l.x" :y="built.h - 8" text-anchor="middle" font-size="9" fill="var(--text-faint)" font-family="var(--font-mono)">{{ l.label }}</text>
    <path :d="built.a.area" :fill="`url(#${gradA})`" />
    <path :d="built.a.line" fill="none" stroke="var(--accent)" stroke-width="1.6" />
    <path :d="built.d.area" :fill="`url(#${gradD})`" />
    <path :d="built.d.line" fill="none" stroke="var(--danger)" stroke-width="1.4" />
  </svg>
</template>
