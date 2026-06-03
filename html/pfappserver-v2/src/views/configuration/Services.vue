<script setup>
import Icon from '@/components/Icon.vue'

const svcs = [
  ['pf', 'core orchestrator', 'running'],
  ['radiusd-auth', 'FreeRADIUS auth', 'running'],
  ['radiusd-acct', 'FreeRADIUS accounting', 'running'],
  ['pfdns', 'DNS enforcement', 'running'],
  ['pfdhcp', 'DHCP enforcement', 'running'],
  ['haproxy-portal', 'captive portal LB', 'running'],
  ['haproxy-admin', 'admin LB', 'running'],
  ['pfqueue', 'job queue workers', 'running'],
  ['pfdetect', 'event handler', 'running'],
  ['pffilter', 'filter engine', 'running'],
  ['httpd.portal', 'portal web', 'running'],
  ['httpd.aaa', 'AAA web', 'running'],
  ['fingerbank-collector', 'device profiling', 'running'],
  ['pfcron', 'scheduled tasks', 'running'],
  ['pfacct', 'RADIUS accounting', 'running'],
  ['redis_queue', 'queue backend', 'stopped'],
]
</script>

<template>
  <div class="tbl-wrap">
    <div class="tbl-toolbar">
      <div class="tbl-search"><Icon name="search" /><input placeholder="Search services…" /></div>
      <div style="margin-left:auto; display:flex; gap:6px">
        <button class="btn sm"><Icon name="refresh" :size="12" /> Restart all</button>
        <button class="btn sm primary"><Icon name="bolt" :size="12" /> Apply config</button>
      </div>
    </div>
    <table class="tbl">
      <thead><tr><th>Service</th><th>Description</th><th>Status</th><th class="actions-col"></th></tr></thead>
      <tbody>
        <tr v-for="[s, d, st] in svcs" :key="s">
          <td class="mono" style="font-weight:500">{{ s }}</td>
          <td style="color:var(--text-mid)">{{ d }}</td>
          <td>
            <span :class="['chip', st === 'running' ? 'ok' : '']">
              <span v-if="st === 'running'" class="pulse" />{{ st }}
            </span>
          </td>
          <td class="actions-col">
            <div style="display:inline-flex; gap:4px">
              <button class="btn sm ghost" title="Restart"><Icon name="refresh" :size="13" /></button>
              <button class="btn sm ghost" :title="st === 'running' ? 'Stop' : 'Start'">
                <Icon :name="st === 'running' ? 'ban' : 'bolt'" :size="13" />
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
