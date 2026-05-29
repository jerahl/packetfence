<script setup>
// Real Settings page — replaces the placeholder route. Exposes the tweaks
// the design's floating panel used (theme, density, accent, sidebar
// collapse) as proper, persisted preferences plus an About section.
import { useTweaksStore } from '@/stores/tweaks'

const tweaks = useTweaksStore()

// Same five hexes the App.vue accent-hue map keys against. Display labels
// are short on purpose so the row of swatches stays compact.
const ACCENTS = [
  { hex: '#3b82f6', label: 'Cobalt' },
  { hex: '#10b981', label: 'Emerald' },
  { hex: '#a855f7', label: 'Violet' },
  { hex: '#f59e0b', label: 'Amber' },
  { hex: '#f43f5e', label: 'Rose' },
]

function setTheme(v)   { tweaks.theme = v; tweaks.persist() }
function setDensity(v) { tweaks.density = v; tweaks.persist() }
function setAccent(v)  { tweaks.accent = v; tweaks.persist() }
function setCollapsed(v) { tweaks.collapsed = v; tweaks.persist() }
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">Settings</div>
        <div class="page-sub">Appearance and layout preferences are stored locally in this browser.</div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 14px">
      <div class="card-head">
        <div class="card-title">Appearance</div>
        <div class="card-sub">Theme, density and accent</div>
      </div>
      <div class="card-body">
        <div class="form-grid">
          <div class="label-h">
            <div class="lbl">Theme</div>
            <div class="hint">Dark is the default; light flips the same oklch curve.</div>
          </div>
          <div>
            <div class="segmented">
              <button :class="{ on: tweaks.theme === 'dark' }"  @click="setTheme('dark')">Dark</button>
              <button :class="{ on: tweaks.theme === 'light' }" @click="setTheme('light')">Light</button>
            </div>
          </div>

          <div class="label-h">
            <div class="lbl">Density</div>
            <div class="hint">Affects row heights and card padding across every table and page.</div>
          </div>
          <div>
            <div class="segmented">
              <button :class="{ on: tweaks.density === 'tight' }"    @click="setDensity('tight')">Tight</button>
              <button :class="{ on: tweaks.density === 'balanced' }" @click="setDensity('balanced')">Balanced</button>
              <button :class="{ on: tweaks.density === 'spacious' }" @click="setDensity('spacious')">Spacious</button>
            </div>
          </div>

          <div class="label-h">
            <div class="lbl">Accent</div>
            <div class="hint">Used for primary actions, active nav, focus rings and selection highlights.</div>
          </div>
          <div class="swatches">
            <button
              v-for="a in ACCENTS" :key="a.hex"
              type="button"
              :class="['swatch', { on: tweaks.accent === a.hex }]"
              :style="{ background: a.hex }"
              :title="a.label"
              :aria-label="a.label"
              :aria-pressed="tweaks.accent === a.hex"
              @click="setAccent(a.hex)"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 14px">
      <div class="card-head">
        <div class="card-title">Layout</div>
      </div>
      <div class="card-body">
        <div class="form-grid">
          <div class="label-h">
            <div class="lbl">Collapse sidebar</div>
            <div class="hint">Keeps the icon rail; labels and badges hide. Toggle from the top bar too.</div>
          </div>
          <div>
            <label class="toggle" :class="{ on: tweaks.collapsed }">
              <input type="checkbox" :checked="tweaks.collapsed" @change="e => setCollapsed(e.target.checked)" style="display:none" />
              <span class="toggle-track"><span class="toggle-thumb" /></span>
              <span style="font-size: 12px; color: var(--text-mid)">{{ tweaks.collapsed ? 'Collapsed' : 'Expanded' }}</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <div class="card-title">About</div>
      </div>
      <div class="card-body">
        <div class="kv" style="grid-template-columns: 140px 1fr">
          <div class="k">App</div><div class="v sans">PacketFence Admin v2 (preview)</div>
          <div class="k">Stack</div><div class="v sans">Vue 3 · Vite · Pinia · Vue Router 4</div>
          <div class="k">Design source</div><div class="v sans">Claude Design handoff (PacketFence Redesign)</div>
          <div class="k">Existing UI</div><div class="v sans"><a href="/admin/" style="color: var(--accent); text-decoration: none">/admin/</a></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Accent swatches — chunky round buttons with a ring when selected. */
.swatches { display: inline-flex; gap: 10px; }
.swatch {
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  outline: none;
  box-shadow: inset 0 0 0 1px oklch(0 0 0 / 0.2);
}
.swatch.on { border-color: var(--text); box-shadow: inset 0 0 0 1px oklch(0 0 0 / 0.2), 0 0 0 2px var(--bg); }
.swatch:focus-visible { box-shadow: inset 0 0 0 1px oklch(0 0 0 / 0.2), 0 0 0 3px var(--accent-soft); }

/* Toggle — borrowed from the design's tweaks-panel pattern. */
.toggle { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; }
.toggle-track {
  width: 30px; height: 18px; background: var(--bg-active); border-radius: 10px;
  position: relative; transition: background 0.12s;
  border: 1px solid var(--border);
  display: inline-block;
}
.toggle-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 12px; height: 12px; background: var(--text-mid); border-radius: 50%;
  transition: transform 0.12s, background 0.12s;
}
.toggle.on .toggle-track { background: var(--accent); border-color: var(--accent); }
.toggle.on .toggle-thumb { transform: translateX(12px); background: var(--accent-fg); }
</style>
