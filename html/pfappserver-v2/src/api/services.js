// PacketFence services management — powers Status > Services.
//
// The backend exposes one cheap call for the whole table plus per-service
// control actions:
//   GET  /api/v1/services/status_all          -> { items: [{ id, alive, managed, enabled, pid }] }
//   POST /api/v1/service/<id>/{start,stop,restart,enable,disable}
//
// Mirrors the v1 /admin/status/services page (service status + start / stop /
// restart / enable / disable), minus the cluster fan-out — single node here,
// matching the rest of the v2 app until /cluster servers is wired in.

import { api } from './client'

export const ACTIONS = ['start', 'stop', 'restart', 'enable', 'disable']

export const servicesApi = {
  // GET /api/v1/services/status_all
  async statusAll() {
    const data = await api.get('services/status_all')
    return data?.items || []
  },

  // POST /api/v1/service/<id>/<action>. PF runs the action synchronously and
  // returns the post-action service_info; callers refresh statusAll after.
  action(id, action) {
    if (!ACTIONS.includes(action)) {
      return Promise.reject(new Error(`unknown service action: ${action}`))
    }
    return api.post(`service/${encodeURIComponent(id)}/${action}`)
  },
}
