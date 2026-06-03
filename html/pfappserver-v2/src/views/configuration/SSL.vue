<script setup>
import Icon from '@/components/Icon.vue'

const certs = [
  ['http',    '*.nac.example.net',       'DigiCert TLS RSA',     '2026-11-04', 157,  'valid'],
  ['radius',  'radius.nac.example.net',  'PacketFence Root CA',  '2026-07-18', 48,   'expiring'],
  ['portal',  'portal.nac.example.net',  "Let's Encrypt R3",     '2026-06-22', 22,   'expiring'],
  ['pki-ca',  'PacketFence Root CA',     'self-signed',          '2031-01-01', 1706, 'valid'],
]
</script>

<template>
  <div class="tbl-wrap">
    <div class="tbl-toolbar">
      <div class="tbl-search"><Icon name="search" /><input placeholder="Search certificates…" /></div>
      <div style="margin-left:auto; display:flex; gap:6px">
        <button class="btn sm"><Icon name="download" :size="12" /> CSR</button>
        <button class="btn sm primary"><Icon name="plus" :size="12" /> Generate / Upload</button>
      </div>
    </div>
    <table class="tbl">
      <thead>
        <tr>
          <th>Service</th><th>Common name</th><th>Issuer</th>
          <th>Expires</th><th>Days left</th><th>Status</th><th class="actions-col"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="[svc, cn, iss, exp, days, st] in certs" :key="svc">
          <td><span class="chip accent">{{ svc }}</span></td>
          <td class="mono" style="font-weight:500">{{ cn }}</td>
          <td style="color:var(--text-mid)">{{ iss }}</td>
          <td class="mono" style="color:var(--text-dim)">{{ exp }}</td>
          <td class="mono num" :style="{ color: days < 30 ? 'var(--warn)' : 'var(--text-mid)' }">{{ days }}</td>
          <td><span :class="['chip', st === 'valid' ? 'ok' : 'warn']">{{ st }}</span></td>
          <td class="actions-col"><button class="btn sm ghost"><Icon name="more" :size="13" /></button></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
