<script setup>
import Icon from '@/components/Icon.vue'

const roles = [
  ['ALL',      'Super administrator — every action', '3', 'all'],
  ['NOC',      'Network operations — read + remediate', '4', 'nodes, security_events, reports'],
  ['Helpdesk', 'Register & unregister endpoints', '6', 'nodes (limited), users'],
  ['Security', 'Investigate & isolate', '2', 'security_events, nodes, reports'],
  ['ReadOnly', 'Dashboards & reports only', '5', 'read-only'],
]
</script>

<template>
  <div class="tbl-wrap">
    <div class="tbl-toolbar">
      <div class="tbl-search"><Icon name="search" /><input placeholder="Search admin roles…" /></div>
      <div style="margin-left:auto">
        <button class="btn sm primary"><Icon name="plus" :size="12" /> New Admin Role</button>
      </div>
    </div>
    <table class="tbl">
      <thead>
        <tr>
          <th>Admin role</th><th>Description</th><th>Members</th><th>Access</th><th class="actions-col"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="[n, d, m, a] in roles" :key="n">
          <td><span class="chip accent">{{ n }}</span></td>
          <td style="color:var(--text-mid)">{{ d }}</td>
          <td class="mono num">{{ m }}</td>
          <td class="mono" style="color:var(--text-dim)">{{ a }}</td>
          <td class="actions-col"><button class="btn sm ghost"><Icon name="more" :size="13" /></button></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
