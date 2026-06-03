import { defineStore } from 'pinia'

// Persisted appearance settings. Default to the design's dark/balanced/cobalt.
const KEY = 'pf-v2-tweaks'

const DEFAULTS = {
  theme: 'dark',         // 'dark' | 'light'
  density: 'balanced',   // 'tight' | 'balanced' | 'spacious'
  accent: '#3b82f6',     // one of five fixed hexes (see ACCENT_HUES in App.vue)
  collapsed: false,      // sidebar collapsed
}

function loadInitial() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {}
  return { ...DEFAULTS }
}

export const useTweaksStore = defineStore('tweaks', {
  state: () => loadInitial(),
  actions: {
    toggleTheme() { this.theme = this.theme === 'dark' ? 'light' : 'dark' },
    toggleCollapsed() { this.collapsed = !this.collapsed },
    persist() {
      try { localStorage.setItem(KEY, JSON.stringify(this.$state)) } catch {}
    },
  },
})
