// pfqueue stats — powers Status > Local Queue.
//
//   GET /api/v1/queues/stats -> { items: [ {
//     queue: <name>,
//     stats: { count, outstanding: [{ name, count }], expired: [{ name, count }] }
//   } ] }
//
// `count` is the current queue depth; `outstanding` / `expired` are
// per-task-type counters. Mirrors the v1 /admin/status/queue page.

import { api } from './client'

export const queueApi = {
  // GET /api/v1/queues/stats
  async stats() {
    const data = await api.get('queues/stats')
    return data?.items || []
  },
}
