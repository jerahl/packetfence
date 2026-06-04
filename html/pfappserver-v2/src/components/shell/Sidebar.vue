<script setup>
import { RouterLink } from 'vue-router'
import Icon from '@/components/Icon.vue'

// Sidebar IA — three groups, eight items, matches the design's NAV array.
// Badges are placeholders; will come from the API once wired.
// `id` is the Vue Router route name. Two items happen to share a label
// ("Network" lives under both Operate and Status) — the route names are
// distinct (`network` vs `status-network`) so the router can resolve
// them; the sidebar UX disambiguates via the parent group label.
const NAV = [
  { group: 'Operate', items: [
    { id: 'overview',   label: 'Overview',   icon: 'overview' },
    { id: 'endpoints',  label: 'Endpoints',  icon: 'endpoints', badge: '2,847' },
    { id: 'identities', label: 'Identities', icon: 'identities', badge: '613' },
    { id: 'network',    label: 'Network',    icon: 'network' },
  ]},
  { group: 'Govern', items: [
    { id: 'policies', label: 'Policies', icon: 'policies' },
    { id: 'security', label: 'Security', icon: 'security', badge: '8' },
    { id: 'reports',  label: 'Reports',  icon: 'reports' },
  ]},
  { group: 'Status', items: [
    { id: 'status-monitoring', label: 'Monitoring',  icon: 'signal' },
    { id: 'status-assets',     label: 'Assets',      icon: 'inspect' },
    { id: 'status-threats',    label: 'Threats',     icon: 'alert' },
    { id: 'status-network',    label: 'Network',     icon: 'network' },
    { id: 'status-communication', label: 'Communication', icon: 'globe' },
    { id: 'status-services',   label: 'Services',    icon: 'switch' },
    { id: 'status-queue',      label: 'Local Queue', icon: 'list' },
  ]},
  { group: 'System', items: [
    { id: 'configuration', label: 'Configuration', icon: 'settings' },
    { id: 'settings',      label: 'Settings',      icon: 'inspect' },
  ]},
]
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-brand">
      <div class="brand-mark">P</div>
      <div class="brand-name">PacketFence</div>
      <div class="brand-tag">v2</div>
    </div>
    <div class="sidebar-scroll">
      <div class="nav-section" v-for="group in NAV" :key="group.group">
        <div class="nav-label">{{ group.group }}</div>
        <RouterLink
          v-for="item in group.items"
          :key="item.id"
          :to="{ name: item.id }"
          custom
          v-slot="{ href, navigate, isActive }"
        >
          <a
            :href="href"
            @click="navigate"
            :class="['nav-item', { active: isActive }]"
            :title="item.label"
          >
            <Icon :name="item.icon" />
            <span class="label">{{ item.label }}</span>
            <span class="badge" v-if="item.badge">{{ item.badge }}</span>
          </a>
        </RouterLink>
      </div>
    </div>
    <div class="sidebar-foot">
      <span class="dot" />
      <span class="sidebar-foot-text">Cluster healthy · 3 nodes</span>
    </div>
  </aside>
</template>
