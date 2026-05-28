import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/overview' },
  // Operate
  { path: '/overview',   name: 'overview',   component: () => import('@/views/Overview.vue'),   meta: { crumbs: ['Operate', 'Overview'] } },
  { path: '/endpoints',  name: 'endpoints',  component: () => import('@/views/Endpoints.vue'),  meta: { crumbs: ['Operate', 'Endpoints'] } },
  { path: '/identities', name: 'identities', component: () => import('@/views/Placeholder.vue'), meta: { crumbs: ['Operate', 'Identities'], title: 'Identities' } },
  { path: '/network',    name: 'network',    component: () => import('@/views/Placeholder.vue'), meta: { crumbs: ['Operate', 'Network'], title: 'Network' } },
  // Govern
  { path: '/policies',   name: 'policies',   component: () => import('@/views/Placeholder.vue'), meta: { crumbs: ['Govern', 'Policies'], title: 'Policies' } },
  { path: '/security',   name: 'security',   component: () => import('@/views/Placeholder.vue'), meta: { crumbs: ['Govern', 'Security'], title: 'Security events' } },
  { path: '/reports',    name: 'reports',    component: () => import('@/views/Placeholder.vue'), meta: { crumbs: ['Govern', 'Reports'], title: 'Reports' } },
  // System
  { path: '/settings',   name: 'settings',   component: () => import('@/views/Placeholder.vue'), meta: { crumbs: ['System', 'Settings'], title: 'Settings' } },
]

export default createRouter({
  // Matches Vite `base: '/admin/v2/'` so URLs render as /admin/v2/overview etc.
  history: createWebHistory('/admin/v2/'),
  routes,
})
