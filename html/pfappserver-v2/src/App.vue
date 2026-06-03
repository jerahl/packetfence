<script setup>
import { onMounted, onBeforeUnmount, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useTweaksStore } from '@/stores/tweaks'
import { useUiStore } from '@/stores/ui'
import AppShell from '@/components/shell/AppShell.vue'
import CommandPalette from '@/components/cmdk/CommandPalette.vue'

const tweaks = useTweaksStore()
const ui = useUiStore()
const route = useRoute()

// Apply theme/density/accent imperatively to <html> so global CSS tokens
// resolve correctly. Accent hue is overridden so any of the five accent
// presets shares the same lightness curve as the dark/light theme.
const ACCENT_HUES = { '#3b82f6': 250, '#10b981': 150, '#a855f7': 290, '#f59e0b': 70, '#f43f5e': 15 }
watchEffect(() => {
  const root = document.documentElement
  root.setAttribute('data-theme', tweaks.theme)
  root.setAttribute('data-density', tweaks.density)
  const hue = ACCENT_HUES[tweaks.accent] ?? 250
  const isDark = tweaks.theme === 'dark'
  root.style.setProperty('--accent',        `oklch(${isDark ? '0.72' : '0.55'} 0.16 ${hue})`)
  root.style.setProperty('--accent-soft',   `oklch(${isDark ? '0.72' : '0.55'} 0.16 ${hue} / ${isDark ? '0.14' : '0.10'})`)
  root.style.setProperty('--accent-strong', `oklch(${isDark ? '0.78' : '0.48'} 0.18 ${hue})`)
})

// Close the inspector when the route changes so it doesn't leak across pages.
watchEffect(() => { void route.fullPath; ui.closeInspector() })

function onKey(e) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    ui.cmdkOpen = !ui.cmdkOpen
  } else if (e.key === 'Escape') {
    ui.cmdkOpen = false
    ui.closeInspector()
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <AppShell>
    <router-view />
  </AppShell>
  <CommandPalette />
</template>
