<script setup>
import { ref } from 'vue'
import Icon from '@/components/Icon.vue'

// Initial state shared by all rows so toggling persists within the
// view's lifetime — the Save button is a no-op for now.
const tasks = ref([
  { id: 'nodes_maintenance',          desc: 'Expire & clean stale nodes',   interval: '5m',  on: true  },
  { id: 'security_event_maintenance', desc: 'Re-evaluate open events',      interval: '1m',  on: true  },
  { id: 'acct_maintenance',           desc: 'Close orphan accounting',      interval: '1m',  on: true  },
  { id: 'cleanup_chi_database_cache', desc: 'Purge CHI cache',              interval: '30m', on: true  },
  { id: 'certificates_check',         desc: 'Warn on expiring certs',       interval: '1d',  on: true  },
  { id: 'fingerbank_data_update',     desc: 'Pull Fingerbank DB',           interval: '1d',  on: true  },
  { id: 'population_maintenance',     desc: 'Refresh materialized views',   interval: '1h',  on: false },
])
</script>

<template>
  <div class="tbl-wrap">
    <div class="tbl-toolbar">
      <div class="tbl-search"><Icon name="search" /><input placeholder="Search tasks…" /></div>
      <div style="margin-left:auto">
        <button class="btn sm primary"><Icon name="check" :size="12" /> Save schedule</button>
      </div>
    </div>
    <table class="tbl">
      <thead><tr><th>Task</th><th>Description</th><th>Interval</th><th>Enabled</th></tr></thead>
      <tbody>
        <tr v-for="t in tasks" :key="t.id">
          <td class="mono" style="font-weight:500">{{ t.id }}</td>
          <td style="color:var(--text-mid)">{{ t.desc }}</td>
          <td class="mono" style="color:var(--text-dim)">{{ t.interval }}</td>
          <td>
            <label :class="['toggle', { on: t.on }]" @click="t.on = !t.on">
              <span class="toggle-track"><span class="toggle-thumb" /></span>
            </label>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
