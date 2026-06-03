<script setup>
// Stroke-based 16px SVG icon set, ported from the design's icons.jsx.
// Each icon is a flat array of [tag, attrs] tuples; the template renders
// them with explicit per-tag <path>/<circle>/<rect> elements so the SVG
// namespace is preserved (a dynamic <component :is> can render in the
// HTML namespace inside <svg>, which breaks the visuals in some browsers).
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 16 },
})

const ICONS = {
  dot:        [['circle', { cx: 8, cy: 8, r: 2 }]],
  overview:   [
    ['rect', { x: 2, y: 2, width: 5, height: 6, rx: 1 }],
    ['rect', { x: 9, y: 2, width: 5, height: 3, rx: 1 }],
    ['rect', { x: 9, y: 7, width: 5, height: 7, rx: 1 }],
    ['rect', { x: 2, y: 10, width: 5, height: 4, rx: 1 }],
  ],
  endpoints:  [
    ['rect', { x: 2, y: 3, width: 8, height: 6, rx: 1 }],
    ['path', { d: 'M4 12h4M6 9v3' }],
    ['rect', { x: 11, y: 8, width: 3, height: 6, rx: 0.5 }],
  ],
  identities: [
    ['circle', { cx: 6, cy: 6, r: 2.5 }],
    ['path',   { d: 'M2 14c0-2.2 1.8-4 4-4s4 1.8 4 4' }],
    ['circle', { cx: 12, cy: 5, r: 1.5 }],
    ['path',   { d: 'M10 11c0-1.5 1-2.5 2-2.5s2 1 2 2.5' }],
  ],
  network: [
    ['circle', { cx: 8, cy: 3, r: 1.5 }],
    ['circle', { cx: 3, cy: 13, r: 1.5 }],
    ['circle', { cx: 13, cy: 13, r: 1.5 }],
    ['path',   { d: 'M8 4.5v3M8 7.5L4 11.5M8 7.5L12 11.5' }],
  ],
  policies: [
    ['path', { d: 'M8 2L3 4v4c0 3 2.5 5.5 5 6.5 2.5-1 5-3.5 5-6.5V4z' }],
    ['path', { d: 'M6 8l1.5 1.5L10.5 6.5' }],
  ],
  security: [
    ['path', { d: 'M3 4l5-2 5 2v4c0 3-2.5 5.5-5 6.5-2.5-1-5-3.5-5-6.5z' }],
    ['path', { d: 'M8 6v3M8 11h0' }],
  ],
  reports: [
    ['path', { d: 'M2 13h12' }],
    ['rect', { x: 3, y: 9, width: 2, height: 4 }],
    ['rect', { x: 7, y: 6, width: 2, height: 7 }],
    ['rect', { x: 11, y: 3, width: 2, height: 10 }],
  ],
  settings: [
    ['circle', { cx: 8, cy: 8, r: 2 }],
    ['path',   { d: 'M8 1.5v2M8 12.5v2M14.5 8h-2M3.5 8h-2M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4M12.6 12.6l-1.4-1.4M4.8 4.8L3.4 3.4' }],
  ],
  search:   [['circle', { cx: 7, cy: 7, r: 4.5 }], ['path', { d: 'M10.5 10.5l3 3' }]],
  bell:     [['path', { d: 'M4 6.5a4 4 0 018 0V10l1.5 1.5h-11L4 10z' }], ['path', { d: 'M6.5 13.5a1.5 1.5 0 003 0' }]],
  filter:   [['path', { d: 'M2 3h12l-4.5 5.5V13L6.5 12V8.5z' }]],
  plus:     [['path', { d: 'M8 3v10M3 8h10' }]],
  more:     [
    ['circle', { cx: 3, cy: 8, r: 0.8, fill: 'currentColor' }],
    ['circle', { cx: 8, cy: 8, r: 0.8, fill: 'currentColor' }],
    ['circle', { cx: 13, cy: 8, r: 0.8, fill: 'currentColor' }],
  ],
  chevR:    [['path', { d: 'M6 3l4 5-4 5' }]],
  chevL:    [['path', { d: 'M10 3l-4 5 4 5' }]],
  chevD:    [['path', { d: 'M3 6l5 4 5-4' }]],
  chevU:    [['path', { d: 'M3 10l5-4 5 4' }]],
  x:        [['path', { d: 'M3 3l10 10M13 3L3 13' }]],
  check:    [['path', { d: 'M3 8l3 3 7-7' }]],
  download: [['path', { d: 'M8 2v9M4 7l4 4 4-4' }], ['path', { d: 'M2 13h12' }]],
  refresh:  [
    ['path', { d: 'M3 3v4h4' }],
    ['path', { d: 'M3 7a5.5 5.5 0 0110-1.5' }],
    ['path', { d: 'M13 13V9H9' }],
    ['path', { d: 'M13 9a5.5 5.5 0 01-10 1.5' }],
  ],
  copy:    [['rect', { x: 5, y: 5, width: 8, height: 8, rx: 1 }], ['path', { d: 'M3 11V3h8' }]],
  laptop:  [['rect', { x: 2, y: 3, width: 12, height: 8, rx: 1 }], ['path', { d: 'M1 13h14' }]],
  phone:   [['rect', { x: 5, y: 2, width: 6, height: 12, rx: 1 }], ['path', { d: 'M7.5 12h1' }]],
  iot:     [
    ['rect', { x: 3, y: 3, width: 10, height: 10, rx: 2 }],
    ['circle', { cx: 6, cy: 6, r: 0.7, fill: 'currentColor' }],
    ['path', { d: 'M9 6h2M9 9h2M5 11h2' }],
  ],
  voip:    [['path', { d: 'M3 4c0 5 4 9 9 9l1-3-2.5-1-1.5 1.5C7.5 9.5 6.5 8 6 6.5L7.5 5 6.5 2.5z' }]],
  tv:      [['rect', { x: 2, y: 3, width: 12, height: 8, rx: 1 }], ['path', { d: 'M6 14h4' }]],
  vm:      [['rect', { x: 2, y: 3, width: 12, height: 8, rx: 1 }], ['path', { d: 'M6 7l3 1.5L6 10z', fill: 'currentColor' }]],
  ap:      [
    ['path', { d: 'M3 8a5 5 0 0110 0' }],
    ['path', { d: 'M5.5 9.5a2.5 2.5 0 015 0' }],
    ['circle', { cx: 8, cy: 11.5, r: 1, fill: 'currentColor' }],
  ],
  tablet:  [['rect', { x: 3, y: 2, width: 10, height: 12, rx: 1 }], ['path', { d: 'M7 12h2' }]],
  desktop: [['rect', { x: 2, y: 3, width: 12, height: 8, rx: 1 }], ['path', { d: 'M5 14h6M8 11v3' }]],
  switch:  [['rect', { x: 2, y: 5, width: 12, height: 6, rx: 1 }], ['path', { d: 'M4 8h1M6 8h1M8 8h1M10 8h1' }]],
  alert:   [['path', { d: 'M8 2l6 11H2z' }], ['path', { d: 'M8 6v3M8 11h0' }]],
  shield:  [['path', { d: 'M3 4l5-2 5 2v4c0 3-2.5 5.5-5 6.5-2.5-1-5-3.5-5-6.5z' }]],
  user:    [['circle', { cx: 8, cy: 6, r: 2.5 }], ['path', { d: 'M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5' }]],
  clock:   [['circle', { cx: 8, cy: 8, r: 5.5 }], ['path', { d: 'M8 5v3l2 1.5' }]],
  collapse:[['path', { d: 'M9 3l-4 5 4 5' }], ['path', { d: 'M13 3v10' }]],
  expand:  [['path', { d: 'M7 3l4 5-4 5' }], ['path', { d: 'M3 3v10' }]],
  inspect: [['rect', { x: 2, y: 3, width: 12, height: 10, rx: 1 }], ['path', { d: 'M10 3v10' }]],
  globe:   [
    ['circle', { cx: 8, cy: 8, r: 5.5 }],
    ['path', { d: 'M2.5 8h11M8 2.5c2 2 2 9 0 11M8 2.5c-2 2-2 9 0 11' }],
  ],
  arrowR:  [['path', { d: 'M3 8h10M9 4l4 4-4 4' }]],
  bolt:    [['path', { d: 'M9 2L3 9h4l-1 5 6-7H8z' }]],
  trash:   [['path', { d: 'M3 5h10M6 5V3h4v2M5 5l1 9h4l1-9' }]],
  ban:     [['circle', { cx: 8, cy: 8, r: 5.5 }], ['path', { d: 'M4 4l8 8' }]],
  unlock:  [['rect', { x: 3, y: 8, width: 10, height: 6, rx: 1 }], ['path', { d: 'M5 8V5a3 3 0 016 0' }]],
  signal:  [['path', { d: 'M2 13h2v-2M5 13h2v-5M8 13h2V8M11 13h2V5' }]],
  list:    [['path', { d: 'M3 4h10M3 8h10M3 12h10' }]],
}

const paths = computed(() => ICONS[props.name] || ICONS.dot)
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 16 16"
       fill="none" stroke="currentColor" stroke-width="1.5"
       stroke-linecap="round" stroke-linejoin="round">
    <template v-for="(p, i) in paths" :key="i">
      <path   v-if="p[0] === 'path'"   v-bind="p[1]" />
      <circle v-else-if="p[0] === 'circle'" v-bind="p[1]" />
      <rect   v-else-if="p[0] === 'rect'"   v-bind="p[1]" />
    </template>
  </svg>
</template>
