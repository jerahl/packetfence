<script setup>
// Reports — audit log + placeholders for the other report types.
// The audit log mocks to the same shape PF's /api/v1/audit endpoint will
// return (time/who/action/target/detail/id); wiring is straightforward
// once that endpoint is finalised.
import { ref } from 'vue'
import { NAC_DATA } from '@/data/mock'
import Icon from '@/components/Icon.vue'

const tab = ref('audit')

// PF's audit kinds map onto the chip variants we already have.
function actionChipClass(kind) {
  if (kind === 'ok')  return 'ok'
  if (kind === 'bad') return 'bad'
  if (kind === 'warn') return 'warn'
  return 'info'
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">Reports</div>
        <div class="page-sub">Audit · RADIUS · device fingerprints · custom</div>
      </div>
      <div class="page-tools">
        <button class="btn"><Icon name="download" :size="13" /> Export</button>
        <button class="btn"><Icon name="clock" :size="13" /> Schedule</button>
        <button class="btn primary"><Icon name="plus" :size="13" /> New report</button>
      </div>
    </div>

    <div class="tabs">
      <div
        v-for="[k, l] in [['audit','Admin audit'],['radius','RADIUS log'],['fingerprints','Device fingerprints'],['bandwidth','Bandwidth'],['custom','Custom']]"
        :key="k"
        :class="['t', { active: tab === k }]"
        @click="tab = k"
      >{{ l }}</div>
    </div>

    <div v-if="tab === 'audit'" class="tbl-wrap">
      <div class="tbl-toolbar">
        <div class="tbl-search"><Icon name="search" /><input placeholder="Search audit log…" /></div>
        <button class="tbl-filter"><Icon name="filter" :size="12" /> Actor</button>
        <button class="tbl-filter"><Icon name="filter" :size="12" /> Action</button>
        <button class="tbl-filter applied">Last 24h<span class="v">▾</span></button>
        <div style="margin-left:auto">
          <button class="btn sm"><Icon name="download" :size="12" /></button>
        </div>
      </div>
      <table class="tbl">
        <thead>
          <tr>
            <th>Time</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Target</th>
            <th>Detail</th>
            <th>ID</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in NAC_DATA.audits" :key="a.id">
            <td class="mono" style="color:var(--text-dim)">{{ a.time }}</td>
            <td>{{ a.who }}</td>
            <td><span :class="['chip', actionChipClass(a.kind)]">{{ a.action }}</span></td>
            <td class="mono">{{ a.target }}</td>
            <td style="color:var(--text-dim)">{{ a.detail }}</td>
            <td class="mono" style="color:var(--text-faint)">{{ a.id }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="tab === 'radius'" class="card">
      <div class="empty">RADIUS log view — wiring to /api/v1/radius_audit_log lands in a follow-up.</div>
    </div>
    <div v-else-if="tab === 'fingerprints'" class="card">
      <div class="empty">Device fingerprint distribution — Fingerbank API integration pending.</div>
    </div>
    <div v-else-if="tab === 'bandwidth'" class="card">
      <div class="empty">Bandwidth consumption by role — Netdata series integration pending.</div>
    </div>
    <div v-else-if="tab === 'custom'" class="card">
      <div class="empty">Custom report builder — design TBD.</div>
    </div>
  </div>
</template>
