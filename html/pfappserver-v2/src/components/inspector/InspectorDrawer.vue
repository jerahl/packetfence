<script setup>
import { computed, ref, watch } from 'vue'
import { useUiStore } from '@/stores/ui'
import { NAC_DATA, deviceIcon } from '@/data/mock'
import Icon from '@/components/Icon.vue'
import StatusChip from '@/components/ui/StatusChip.vue'

const ui = useUiStore()
const tab = ref('overview')

// Reset to Overview every time a new node is opened.
watch(() => ui.inspectorNode?.id, () => { tab.value = 'overview' })

const node = computed(() => ui.inspectorNode)
const events = computed(() => node.value ? NAC_DATA.events.filter(e => e.node.id === node.value.id) : [])

const timeline = computed(() => {
  const n = node.value
  if (!n) return []
  return [
    { t: 'just now', k: 'ok',   a: 'Auth accepted',       d: `EAP-TLS · ${n.ssid}` },
    { t: '5m ago',   k: 'info', a: 'Role evaluated',      d: `${n.role} → VLAN ${n.vlan}` },
    { t: '1h ago',   k: 'ok',   a: 'Auth accepted',       d: `EAP-TLS · ${n.ssid}` },
    { t: '6h ago',   k: 'info', a: 'Connected to AP',     d: `${n.switch} port ${n.port}` },
    { t: n.registered, k: 'ok', a: 'Endpoint registered', d: 'via ' + (n.type === 'Phone' ? 'BYOD portal' : 'Sponsor') },
  ]
})

const rawJson = computed(() => {
  const n = node.value
  if (!n) return ''
  return JSON.stringify({
    id: n.id, mac: n.mac, hostname: n.hostname, ip: n.ip,
    owner: n.owner, registered: n.registered,
    device: { type: n.type, os: n.os, vendor: n.vendor },
    network: { switch: n.switch, port: n.port, ssid: n.ssid, vlan: n.vlan },
    policy: { role: n.role, profile: 'cp-01' },
    status: n.status,
    last_seen: n.lastSeen,
    fingerbank: { score: 92, family: n.vendor },
  }, null, 2)
})

function severityChipClass(s) {
  return s === 'critical' || s === 'high' ? 'bad' : s === 'medium' ? 'warn' : 'info'
}
</script>

<template>
  <div :class="['inspector', { open: !!node }]">
    <template v-if="node">
      <div class="insp-head">
        <Icon :name="deviceIcon(node.type)" :size="28" />
        <div style="flex:1; min-width:0">
          <div class="insp-id">{{ node.id }} · {{ node.mac }}</div>
          <div class="insp-title">{{ node.hostname }}</div>
          <div style="display:flex; gap:6px; margin-top:6px; flex-wrap:wrap">
            <StatusChip :status="node.status" />
            <span class="chip accent">{{ node.role }}</span>
            <span class="chip">VLAN {{ node.vlan }}</span>
          </div>
        </div>
        <button class="icon-btn" @click="ui.closeInspector()"><Icon name="x" /></button>
      </div>

      <div class="insp-tabs">
        <button v-for="t in ['overview','timeline','events','raw']" :key="t"
                :class="['insp-tab', { active: tab === t }]"
                @click="tab = t">
          {{ t === 'overview' ? 'Overview' : t === 'timeline' ? 'Timeline' : t === 'events' ? 'Events' : 'Raw' }}
        </button>
      </div>

      <div class="insp-body">
        <template v-if="tab === 'overview'">
          <div class="insp-section">
            <div class="insp-section-h">Identity</div>
            <div class="kv">
              <div class="k">MAC</div>      <div class="v">{{ node.mac }}</div>
              <div class="k">Hostname</div> <div class="v">{{ node.hostname }}</div>
              <div class="k">IP</div>       <div class="v">{{ node.ip }}</div>
              <div class="k">Owner</div>    <div class="v sans">{{ node.owner }}</div>
              <div class="k">Registered</div><div class="v">{{ node.registered }}</div>
            </div>
          </div>
          <div class="insp-section">
            <div class="insp-section-h">Device fingerprint</div>
            <div class="kv">
              <div class="k">Type</div>   <div class="v sans">{{ node.type }}</div>
              <div class="k">OS</div>     <div class="v sans">{{ node.os }}</div>
              <div class="k">Vendor</div> <div class="v sans">{{ node.vendor }}</div>
              <div class="k">DHCP fp</div><div class="v" style="word-break:break-all">1,3,6,15,31,33,43,44,46,47,121,249,252</div>
              <div class="k">Score</div>  <div class="v">92/100 · high confidence</div>
            </div>
          </div>
          <div class="insp-section">
            <div class="insp-section-h">Network attachment</div>
            <div class="kv">
              <div class="k">Switch</div>    <div class="v">{{ node.switch }}</div>
              <div class="k">Port</div>      <div class="v">{{ node.port }}</div>
              <div class="k">SSID</div>      <div class="v">{{ node.ssid }}</div>
              <div class="k">VLAN</div>      <div class="v">{{ node.vlan }}</div>
              <div class="k">Throughput</div><div class="v">{{ node.bandwidth }} ↓ / {{ Math.round(node.bandwidth*0.3) }} ↑ Mbps</div>
            </div>
          </div>
          <div class="insp-section">
            <div class="insp-section-h">Effective policy</div>
            <div style="display:flex; gap:6px; flex-wrap:wrap">
              <span class="chip accent">{{ node.role }}</span>
              <span class="chip">VLAN {{ node.vlan }}</span>
              <span class="chip info">posture: compliant</span>
              <span class="chip">profile: Corporate Wi-Fi (cp-01)</span>
            </div>
          </div>
        </template>

        <template v-else-if="tab === 'timeline'">
          <div class="insp-section">
            <div class="insp-section-h">Recent events</div>
            <div style="position:relative; padding-left:14px">
              <div style="position:absolute; left:5px; top:8px; bottom:8px; width:1px; background:var(--border)" />
              <div
                v-for="(ev, i) in timeline" :key="i"
                :style="{
                  position:'relative', display:'grid', gridTemplateColumns:'1fr auto',
                  gap:'6px', padding:'10px 0',
                  borderBottom: i === timeline.length - 1 ? '0' : '1px solid var(--border)'
                }"
              >
                <div :style="{
                  position:'absolute', left:'-11px', top:'14px', width:'9px', height:'9px',
                  borderRadius:'50%',
                  background: ev.k === 'ok' ? 'var(--success)' : ev.k === 'bad' ? 'var(--danger)' : 'var(--info)',
                  border:'2px solid var(--bg-elev)'
                }" />
                <div>
                  <div style="font-size:12px; font-weight:500">{{ ev.a }}</div>
                  <div style="font-size:11px; color:var(--text-dim); font-family:var(--font-mono)">{{ ev.d }}</div>
                </div>
                <div style="font-size:11px; color:var(--text-faint); font-family:var(--font-mono)">{{ ev.t }}</div>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="tab === 'events'">
          <div class="insp-section">
            <div class="insp-section-h">Security events</div>
            <div v-if="events.length === 0" class="empty">No open security events on this endpoint.</div>
            <div v-else v-for="e in events" :key="e.id" style="padding:10px 0; border-bottom:1px solid var(--border)">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px">
                <span :class="['chip', severityChipClass(e.severity)]">{{ e.severity }}</span>
                <span style="font-weight:500">{{ e.rule }}</span>
                <span style="margin-left:auto; font-size:11px; color:var(--text-faint); font-family:var(--font-mono)">{{ e.time }}</span>
              </div>
              <div style="font-size:12px; color:var(--text-dim)">{{ e.desc }}</div>
            </div>
          </div>
        </template>

        <template v-else-if="tab === 'raw'">
          <div class="insp-section">
            <div class="insp-section-h">Raw record</div>
            <pre style="background:var(--bg); border:1px solid var(--border); border-radius:var(--radius); padding:10px; font-family:var(--font-mono); font-size:11px; color:var(--text-mid); overflow:auto; max-height:400px; margin:0">{{ rawJson }}</pre>
          </div>
        </template>
      </div>

      <div class="insp-foot">
        <button class="btn"><Icon name="bolt" :size="12" /> Re-auth</button>
        <button class="btn"><Icon name="user" :size="12" /> Change role</button>
        <button class="btn danger"><Icon name="ban" :size="12" /> Isolate</button>
        <button class="btn ghost" style="margin-left:auto">Open full page <Icon name="arrowR" :size="12" /></button>
      </div>
    </template>
  </div>
</template>
