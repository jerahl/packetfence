<script setup>
// Stub view for sections not yet implemented. Surfaces the route title from
// the router's meta so each placeholder reads naturally.
import { useRoute } from 'vue-router'
const route = useRoute()
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">{{ route.meta.title || route.name }}</div>
        <div class="page-sub">Coming in a follow-up — this section is part of the Phase 2 roadmap.</div>
      </div>
    </div>
    <div class="card">
      <div class="card-body" style="padding:40px; text-align:center; color:var(--text-dim)">
        Not implemented yet. Use the existing admin UI at
        <a href="/admin/" style="color:var(--accent); text-decoration:none">/admin/</a>
        until this view lands.
      </div>
    </div>
  </div>
</template>
