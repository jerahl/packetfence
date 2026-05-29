<script setup>
// Network — switch inventory + (TODO) wireless controllers, RADIUS servers,
// firewalls, SNMP traps. PF backend endpoints for these live under
// /api/v1/config/switches and /api/v1/config/wrix etc.; wiring lands in
// a follow-up.
import { NAC_DATA } from '@/data/mock'
import Icon from '@/components/Icon.vue'
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">Network</div>
        <div class="page-sub">{{ NAC_DATA.switches.length }} switches · 4 WLAN controllers · 2 firewalls</div>
      </div>
      <div class="page-tools">
        <button class="btn"><Icon name="refresh" :size="13" /> Re-discover</button>
        <button class="btn primary"><Icon name="plus" :size="13" /> Add device</button>
      </div>
    </div>

    <div class="tabs">
      <div class="t active">Switches <span class="chip" style="margin-left:6px">{{ NAC_DATA.switches.length }}</span></div>
      <div class="t">Wireless controllers <span class="chip" style="margin-left:6px">4</span></div>
      <div class="t">RADIUS servers <span class="chip" style="margin-left:6px">3</span></div>
      <div class="t">Firewalls</div>
      <div class="t">SNMP traps</div>
    </div>

    <div class="grid-3">
      <div class="card" v-for="s in NAC_DATA.switches" :key="s.name">
        <div class="card-head">
          <Icon name="switch" />
          <div style="flex:1; min-width:0">
            <div class="card-title mono" style="font-size:12px">{{ s.name }}</div>
            <div class="card-sub">{{ s.model }}</div>
          </div>
          <span :class="['chip', s.health > 85 ? 'ok' : s.health > 60 ? 'warn' : 'bad']">
            <span class="pulse" />online
          </span>
        </div>
        <div class="card-body">
          <div class="kv">
            <div class="k">Mgmt IP</div><div class="v">{{ s.ip }}</div>
            <div class="k">Role</div><div class="v sans">{{ s.role }}</div>
            <div class="k">Sessions</div><div class="v">{{ s.sessions.toLocaleString() }}</div>
          </div>
          <div style="margin-top:12px">
            <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-dim); margin-bottom:4px">
              <span>Health</span><span class="mono">{{ s.health }}%</span>
            </div>
            <div class="bar">
              <span :style="{
                width: s.health + '%',
                background: s.health > 85 ? 'var(--success)' : s.health > 60 ? 'var(--warn)' : 'var(--danger)'
              }" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
