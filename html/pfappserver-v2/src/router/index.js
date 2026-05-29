import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/overview' },
  // Operate
  { path: '/overview',   name: 'overview',   component: () => import('@/views/Overview.vue'),   meta: { crumbs: ['Operate', 'Overview'] } },
  { path: '/endpoints',  name: 'endpoints',  component: () => import('@/views/Endpoints.vue'),  meta: { crumbs: ['Operate', 'Endpoints'] } },
  { path: '/identities', name: 'identities', component: () => import('@/views/Identities.vue'),  meta: { crumbs: ['Operate', 'Identities'] } },
  { path: '/network',    name: 'network',    component: () => import('@/views/Network.vue'),     meta: { crumbs: ['Operate', 'Network'] } },
  // Govern
  { path: '/policies',   name: 'policies',   component: () => import('@/views/Policies.vue'),    meta: { crumbs: ['Govern', 'Policies'] } },
  { path: '/security',   name: 'security',   component: () => import('@/views/Security.vue'),    meta: { crumbs: ['Govern', 'Security'] } },
  { path: '/reports',    name: 'reports',    component: () => import('@/views/Reports.vue'),     meta: { crumbs: ['Govern', 'Reports'] } },
  // Status — Netdata-backed live charts
  { path: '/status/monitoring', name: 'status-monitoring', component: () => import('@/views/status/Monitoring.vue'), meta: { crumbs: ['Status', 'Monitoring'] } },
  { path: '/status/assets',     name: 'status-assets',     component: () => import('@/views/status/StatusStub.vue'), meta: { crumbs: ['Status', 'Assets'],   title: 'Assets',      source: 'endpoint inventory (api/v1/nodes) cross-cut by device class', note: 'Inventory rollups from PF endpoints' } },
  { path: '/status/threats',    name: 'status-threats',    component: () => import('@/views/status/StatusStub.vue'), meta: { crumbs: ['Status', 'Threats'],  title: 'Threats',     source: 'security events + RADIUS auth failure metrics',          note: 'Live security-event volume and rule trends' } },
  { path: '/status/network',    name: 'status-network',    component: () => import('@/views/status/StatusStub.vue'), meta: { crumbs: ['Status', 'Network'],  title: 'Network',     source: 'Netdata system.net / ipv4 / ipv6 charts',                note: 'Live network-stack throughput and errors' } },
  { path: '/status/services',   name: 'status-services',   component: () => import('@/views/status/StatusStub.vue'), meta: { crumbs: ['Status', 'Services'], title: 'Services',    source: 'Netdata cgroup_<service>.* charts (dynamic discovery)',  note: 'Per-container CPU, memory and I/O' } },
  { path: '/status/queue',      name: 'status-queue',      component: () => import('@/views/status/StatusStub.vue'), meta: { crumbs: ['Status', 'Local Queue'], title: 'Local Queue', source: 'packetfence.redis.queue_stats_* + redis_redis-queue.* charts', note: 'pfqueue depth and Redis backing-store stats' } },

  // System
  { path: '/settings',   name: 'settings',   component: () => import('@/views/Settings.vue'),    meta: { crumbs: ['System', 'Settings'] } },
]

export default createRouter({
  // Matches Vite `base: '/admin/v2/'` so URLs render as /admin/v2/overview etc.
  history: createWebHistory('/admin/v2/'),
  routes,
})
