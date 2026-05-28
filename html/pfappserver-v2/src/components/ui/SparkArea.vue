<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Array, required: true },
  color: { type: String, default: 'var(--accent)' },
  fillColor: { type: String, default: 'var(--accent-soft)' },
  width: { type: Number, default: 80 },
  height: { type: Number, default: 36 },
})

const paths = computed(() => {
  const data = props.data
  const max = Math.max(...data), min = Math.min(...data)
  const range = max - min || 1
  const step = props.width / (data.length - 1 || 1)
  const points = data.map((v, i) => [i * step, props.height - ((v - min) / range) * (props.height - 4) - 2])
  const line = points.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')
  const area = line + ` L${props.width},${props.height} L0,${props.height} Z`
  return { line, area }
})
</script>

<template>
  <svg class="spark" :width="width" :height="height">
    <path :d="paths.area" class="area" :fill="fillColor" />
    <path :d="paths.line" :stroke="color" />
  </svg>
</template>
