<script setup>
// Database — a single-card mix of read-only KV info + an inline form
// for the three knobs that PF actually exposes via the admin UI.
import Field from './Field.vue'

const formFields = [
  ['Max connections',   'Upper bound for client connections.', 'mono',   '1000'],
  ['Automatic backups', 'Nightly logical dump.',               'toggle', true],
  ['Backup retention',  'Days to keep dumps.',                 'mono',   '14'],
]
</script>

<template>
  <div class="card" style="max-width: 920px">
    <div class="card-head">
      <div class="card-title">Database</div>
      <div class="card-sub">MariaDB / Galera replication state</div>
    </div>
    <div class="card-body">
      <div class="kv" style="grid-template-columns: 160px 1fr">
        <div class="k">Engine</div>       <div class="v">MariaDB 10.6 · Galera 4</div>
        <div class="k">Primary</div>      <div class="v">pf-node-01.nyc · 1.2 TB</div>
        <div class="k">Replicas</div>     <div class="v">pf-node-02 (lag 0.4s), pf-node-03 (lag 1.1s)</div>
        <div class="k">Cluster size</div> <div class="v">3 nodes · wsrep_ready=ON</div>
        <div class="k">Connections</div>  <div class="v">214 / 1000</div>
        <div class="k">Last backup</div>  <div class="v">2h 14m ago · 412 MB</div>
      </div>
      <div class="form-grid" style="margin-top: 18px">
        <Field v-for="(f, i) in formFields" :key="i" :field="f" />
      </div>
    </div>
  </div>
</template>
