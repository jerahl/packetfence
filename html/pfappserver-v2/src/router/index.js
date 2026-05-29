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
  // System
  { path: '/settings',   name: 'settings',   component: () => import('@/views/Settings.vue'),    meta: { crumbs: ['System', 'Settings'] } },
]

export default createRouter({
  // Matches Vite `base: '/admin/v2/'` so URLs render as /admin/v2/overview etc.
  history: createWebHistory('/admin/v2/'),
  routes,
})
