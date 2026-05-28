<script setup>
import { computed, ref } from 'vue'
import { useUiStore } from '@/stores/ui'
import { NAC_DATA, deviceIcon } from '@/data/mock'
import Icon from '@/components/Icon.vue'
import StatusChip from '@/components/ui/StatusChip.vue'

const ui = useUiStore()

const q = ref('')
const selected = ref(new Set())
const filterStatus = ref(null)
const filterRole = ref(null)

const rows = computed(() => {
  let out = NAC_DATA.nodes
  if (q.value) {
    const ql = q.value.toLowerCase()
    out = out.filter(n =>
      n.mac.toLowerCase().includes(ql) ||
      n.hostname.toLowerCase().includes(ql) ||
      n.owner.toLowerCase().includes(ql) ||
      n.ip.includes(ql) ||
      n.role.includes(ql),
    )
  }
  if (filterStatus.value) out = out.filter(n => n.status === filterStatus.value)
  if (filterRole.value)   out = out.filter(n => n.role === filterRole.value)
  return out
})

const allChecked = computed(() => selected.value.size === rows.value.length && rows.value.length > 0)
const isSelected = (id) => selected.value.has(id)

function toggle(id) {
  // Reactive Set: replace with a copy so Vue picks up the change.
  const next = new Set(selected.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selected.value = next
}
function toggleAll() {
  selected.value = allChecked.value ? new Set() : new Set(rows.value.map(r => r.id))
}
function clearSelection() { selected.value = new Set() }

const openNodeId = computed(() => ui.inspectorNode?.id)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">Endpoints</div>
        <div class="page-sub">
          {{ NAC_DATA.nodes.length.toLocaleString() }} known · {{ rows.length.toLocaleString() }} shown
        </div>
      </div>
      <div class="page-tools">
        <button class="btn"><Icon name="download" :size="13" /> Export CSV</button>
        <button class="btn"><Icon name="copy" :size="13" /> Import</button>
        <button class="btn primary"><Icon name="plus" :size="13" /> Register endpoint</button>
      </div>
    </div>

    <div class="tbl-wrap">
      <div class="tbl-toolbar">
        <div class="tbl-search">
          <Icon name="search" />
          <input v-model="q" placeholder="Search MAC, hostname, user, IP…" />
          <button v-if="q" class="btn sm ghost" @click="q = ''"><Icon name="x" :size="12" /></button>
        </div>
        <button
          :class="['tbl-filter', { applied: !!filterStatus }]"
          @click="filterStatus = filterStatus ? null : 'registered'"
        >
          <Icon name="filter" :size="12" /> Status
          <span v-if="filterStatus" class="v">: {{ filterStatus }}</span>
        </button>
        <button
          :class="['tbl-filter', { applied: !!filterRole }]"
          @click="filterRole = filterRole ? null : 'employee'"
        >
          <Icon name="filter" :size="12" /> Role
          <span v-if="filterRole" class="v">: {{ filterRole }}</span>
        </button>
        <button class="tbl-filter"><Icon name="filter" :size="12" /> Device type</button>
        <button class="tbl-filter"><Icon name="filter" :size="12" /> Last seen</button>
        <button class="tbl-filter"><Icon name="plus" :size="12" /> Add filter</button>
        <div style="margin-left:auto; display:flex; gap:8px; align-items:center">
          <span style="font-size:11px; color:var(--text-dim)">Group by</span>
          <div class="segmented">
            <button class="on">None</button>
            <button>Role</button>
            <button>OS</button>
            <button>Switch</button>
          </div>
          <button class="btn sm"><Icon name="inspect" :size="13" /></button>
        </div>
      </div>

      <div v-if="selected.size > 0" class="bulk-bar">
        <span class="count">{{ selected.size }} selected</span>
        <button class="btn sm"><Icon name="user" :size="12" /> Reassign role</button>
        <button class="btn sm"><Icon name="ban" :size="12" /> Isolate</button>
        <button class="btn sm"><Icon name="unlock" :size="12" /> Re-register</button>
        <button class="btn sm"><Icon name="bolt" :size="12" /> Force re-auth</button>
        <button class="btn sm danger"><Icon name="trash" :size="12" /> Delete</button>
        <button class="btn sm ghost" style="margin-left:auto" @click="clearSelection">Clear</button>
      </div>

      <div style="max-height: calc(100vh - 280px); overflow:auto">
        <table class="tbl">
          <thead>
            <tr>
              <th class="ck">
                <div :class="['checkbox', { checked: allChecked }]" @click="toggleAll" />
              </th>
              <th>Hostname</th>
              <th>MAC</th>
              <th>IP</th>
              <th>OS · Vendor</th>
              <th>Owner</th>
              <th>Role / VLAN</th>
              <th>Network</th>
              <th>Last seen</th>
              <th>Status</th>
              <th class="actions-col"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="n in rows" :key="n.id"
              :class="{ selected: openNodeId === n.id }"
              @click="ui.openInspector(n)"
            >
              <td class="ck" @click.stop="toggle(n.id)">
                <div :class="['checkbox', { checked: isSelected(n.id) }]" />
              </td>
              <td>
                <span style="display:inline-flex; align-items:center; gap:8px">
                  <Icon :name="deviceIcon(n.type)" />
                  <span class="mono" style="color:var(--text)">{{ n.hostname }}</span>
                  <Icon v-if="n.events > 0" name="alert" :size="12" style="color:var(--danger)" />
                </span>
              </td>
              <td class="mono">{{ n.mac }}</td>
              <td class="mono" style="color:var(--text-dim)">{{ n.ip }}</td>
              <td style="color:var(--text-dim)">
                <div style="line-height:1.2">
                  <div style="color:var(--text)">{{ n.os }}</div>
                  <div style="font-size:10px">{{ n.vendor }}</div>
                </div>
              </td>
              <td>{{ n.owner }}</td>
              <td>
                <span class="chip accent">{{ n.role }}</span>
                <span class="mono" style="color:var(--text-dim); margin-left:6px; font-size:10px">v{{ n.vlan }}</span>
              </td>
              <td class="mono" style="color:var(--text-dim)">{{ n.ssid }} · {{ n.port }}</td>
              <td class="mono" style="color:var(--text-dim)">{{ n.lastSeen }}</td>
              <td><StatusChip :status="n.status" /></td>
              <td class="actions-col" @click.stop>
                <button class="btn sm ghost"><Icon name="more" :size="13" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="tbl-foot">
        <span>Showing <b class="num">{{ rows.length }}</b> of {{ NAC_DATA.nodes.length.toLocaleString() }}</span>
        <div class="pager">
          <button><Icon name="chevL" :size="12" /></button>
          <button class="cur">1</button>
          <button>2</button>
          <button>3</button>
          <button>…</button>
          <button>57</button>
          <button><Icon name="chevR" :size="12" /></button>
        </div>
      </div>
    </div>
  </div>
</template>
