<script setup>
import Icon from '@/components/Icon.vue'

const nodes = [
  { name: 'pf-node-01.nyc', ip: '10.1.0.5', role: 'primary',   galera: 'Synced',          load: 38, db: '8.0.36' },
  { name: 'pf-node-02.nyc', ip: '10.1.0.6', role: 'secondary', galera: 'Synced',          load: 31, db: '8.0.36' },
  { name: 'pf-node-03.bos', ip: '10.3.0.5', role: 'secondary', galera: 'Donor/Desynced',  load: 64, db: '8.0.36' },
]
</script>

<template>
  <div style="display:flex; flex-direction:column; gap:14px">
    <div class="card">
      <div class="card-head">
        <div>
          <div class="card-title">Cluster status</div>
          <div class="card-sub">Active/active · Galera quorum 3/3 · VIP 10.1.0.4</div>
        </div>
        <div class="card-tools">
          <span class="chip ok"><span class="pulse" />healthy</span>
          <button class="btn sm"><Icon name="refresh" :size="12" /> Re-sync</button>
        </div>
      </div>
      <div class="grid-3" style="margin:0; padding:14px">
        <div class="card" v-for="n in nodes" :key="n.name" style="background: var(--bg)">
          <div class="card-head">
            <Icon name="switch" />
            <div style="flex:1; min-width:0">
              <div class="card-title mono" style="font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">{{ n.name }}</div>
              <div class="card-sub">{{ n.role }}</div>
            </div>
            <span :class="['chip', n.galera === 'Synced' ? 'ok' : 'warn']" style="flex-shrink:0">
              {{ n.galera === 'Synced' ? 'synced' : 'sync' }}
            </span>
          </div>
          <div class="card-body">
            <div class="kv">
              <div class="k">Mgmt IP</div><div class="v">{{ n.ip }}</div>
              <div class="k">Galera</div><div class="v sans">{{ n.galera }}</div>
              <div class="k">MariaDB</div><div class="v">{{ n.db }}</div>
            </div>
            <div style="margin-top:12px">
              <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-dim); margin-bottom:4px">
                <span>Load</span><span class="mono">{{ n.load }}%</span>
              </div>
              <div class="bar">
                <span :style="{ width: n.load + '%', background: n.load > 60 ? 'var(--warn)' : 'var(--success)' }" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
