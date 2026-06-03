<script setup>
// Shared placeholder for the Status > * routes that aren't built yet.
// Reads the route's meta for what to call this section and where its
// underlying Netdata charts (or other data source) will come from.
import { useRoute } from 'vue-router'
const route = useRoute()
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">{{ route.meta.title || route.name }}</div>
        <div class="page-sub">{{ route.meta.note }}</div>
      </div>
    </div>
    <div class="card">
      <div class="card-body" style="padding:40px; text-align:center; color:var(--text-dim)">
        Coming next. This section will render
        <span class="mono" style="color:var(--text)">{{ route.meta.source }}</span>
        once it's wired up — see
        <router-link :to="{ name: 'status-monitoring' }" style="color:var(--accent); text-decoration:none">Monitoring</router-link>
        for the pattern.
      </div>
    </div>
  </div>
</template>
