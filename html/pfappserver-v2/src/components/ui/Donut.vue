<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Array, required: true },   // [{ name, v, color }]
  size: { type: Number, default: 140 },
})

const built = computed(() => {
  const total = props.data.reduce((s, d) => s + d.v, 0)
  const r = props.size / 2 - 18
  const cx = props.size / 2, cy = props.size / 2
  let acc = 0
  const arcs = props.data.map((d) => {
    const start = acc / total * Math.PI * 2 - Math.PI / 2
    acc += d.v
    const end = acc / total * Math.PI * 2 - Math.PI / 2
    const large = end - start > Math.PI ? 1 : 0
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end)
    return { d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`, color: d.color }
  })
  return { total, r, cx, cy, arcs }
})
</script>

<template>
  <svg :width="size" :height="size">
    <circle :cx="built.cx" :cy="built.cy" :r="built.r" stroke="var(--border)" stroke-width="14" fill="none" />
    <path v-for="(a, i) in built.arcs" :key="i" :d="a.d" :stroke="a.color" stroke-width="14" fill="none" stroke-linecap="butt" />
    <text :x="built.cx" :y="built.cy - 2" text-anchor="middle" font-size="22" font-weight="600" fill="var(--text)" font-family="var(--font-sans)">{{ built.total.toLocaleString() }}</text>
    <text :x="built.cx" :y="built.cy + 13" text-anchor="middle" font-size="10" fill="var(--text-dim)" letter-spacing="0.1em">ENDPOINTS</text>
  </svg>
</template>
