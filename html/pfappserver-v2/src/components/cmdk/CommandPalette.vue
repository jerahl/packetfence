<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { NAC_DATA } from '@/data/mock'
import Icon from '@/components/Icon.vue'

const ui = useUiStore()
const router = useRouter()

const q = ref('')
const idx = ref(0)
const inputEl = ref(null)

watch(() => ui.cmdkOpen, (open) => {
  if (open) {
    q.value = ''
    idx.value = 0
    nextTick(() => inputEl.value?.focus())
  }
})

const items = computed(() => {
  const ql = q.value.trim().toLowerCase()
  const nav = [
    { kind: 'Navigate', id: 'overview',   label: 'Overview' },
    { kind: 'Navigate', id: 'endpoints',  label: 'Endpoints' },
    { kind: 'Navigate', id: 'identities', label: 'Identities' },
    { kind: 'Navigate', id: 'network',    label: 'Network' },
    { kind: 'Navigate', id: 'policies',   label: 'Policies' },
    { kind: 'Navigate', id: 'security',   label: 'Security events' },
    { kind: 'Navigate', id: 'reports',    label: 'Reports' },
    { kind: 'Navigate', id: 'configuration', label: 'Configuration' },
    { kind: 'Navigate', id: 'settings',       label: 'Settings' },
    { kind: 'Action',   id: 'register',   label: 'Register new endpoint', desc: 'Open registration form' },
    { kind: 'Action',   id: 'isolate',    label: 'Isolate endpoint…',     desc: 'Pick endpoint to isolate' },
    { kind: 'Action',   id: 'exportcsv',  label: 'Export endpoints to CSV' },
  ]
  const nodeMatches = ql
    ? NAC_DATA.nodes.filter(n =>
        n.mac.toLowerCase().includes(ql) ||
        n.hostname.toLowerCase().includes(ql) ||
        n.owner.toLowerCase().includes(ql) ||
        n.ip.includes(ql),
      ).slice(0, 6).map(n => ({
        kind: 'Endpoint',
        id: n.id,
        label: n.hostname,
        desc: `${n.mac} · ${n.owner} · ${n.role}`,
        node: n,
      }))
    : []
  const filtered = ql
    ? [...nodeMatches, ...nav.filter(i => i.label.toLowerCase().includes(ql))]
    : nav
  return filtered
})

const grouped = computed(() => {
  const out = {}
  for (const it of items.value) (out[it.kind] = out[it.kind] || []).push(it)
  return out
})

watch(items, () => { if (idx.value >= items.value.length) idx.value = 0 })

function activate(it) {
  if (!it) return
  if (it.kind === 'Navigate') router.push({ name: it.id })
  else if (it.kind === 'Endpoint') ui.openInspector(it.node)
  ui.cmdkOpen = false
}

function onKey(e) {
  if (e.key === 'Escape')    { ui.cmdkOpen = false; return }
  if (e.key === 'ArrowDown') { e.preventDefault(); idx.value = Math.min(idx.value + 1, items.value.length - 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); idx.value = Math.max(idx.value - 1, 0) }
  else if (e.key === 'Enter')   { e.preventDefault(); activate(items.value[idx.value]) }
}

function iconFor(kind) {
  return kind === 'Navigate' ? 'arrowR' : kind === 'Endpoint' ? 'endpoints' : 'bolt'
}
</script>

<template>
  <Teleport to="body">
    <div v-if="ui.cmdkOpen" class="cmdk-back" @click="ui.cmdkOpen = false">
      <div class="cmdk" role="dialog" aria-modal="true" @click.stop @keydown="onKey">
        <div class="cmdk-input">
          <Icon name="search" :size="18" />
          <input ref="inputEl" v-model="q" placeholder="Search or run a command…" />
          <span class="kbd">esc</span>
        </div>
        <div class="cmdk-list">
          <div v-if="items.length === 0" class="empty">No matches</div>
          <div v-for="(list, group) in grouped" :key="group">
            <div class="cmdk-group">{{ group }}</div>
            <div
              v-for="(it) in list" :key="it.id"
              :class="['cmdk-item', { active: items.indexOf(it) === idx }]"
              @mouseenter="idx = items.indexOf(it)"
              @click="activate(it)"
            >
              <Icon :name="iconFor(it.kind)" />
              <div>
                <div>{{ it.label }}</div>
                <div v-if="it.desc" class="desc">{{ it.desc }}</div>
              </div>
              <span v-if="items.indexOf(it) === idx" class="kbd">↵</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
