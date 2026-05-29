// Generic data-loading composable. Calls `fetcher` on mount (and when
// `key` changes), exposing loading/error/data refs and a `refresh()` method.
//
// `fallback`: if the fetch fails (network or non-2xx), use this value
// instead. Set to undefined to surface the error to the caller. This is
// the seam that lets views work against mock data in dev when the API
// isn't reachable yet — pass the mock array as fallback.
//
// `quiet`: when true and a fallback is provided, the error is logged but
// not surfaced as `error.value`. Used by views that want a silent
// dev-mode degradation.

import { isRef, onMounted, ref, shallowRef, watch } from 'vue'

export function useResource(fetcher, { fallback, key, quiet = true } = {}) {
  const data = shallowRef(fallback ?? null)
  const loading = ref(false)
  const error = shallowRef(null)
  let lastReqId = 0

  async function refresh() {
    const reqId = ++lastReqId
    loading.value = true
    error.value = null
    try {
      const result = await fetcher()
      if (reqId !== lastReqId) return // discarded by a newer call
      data.value = result
    } catch (e) {
      if (reqId !== lastReqId) return
      if (fallback !== undefined) {
        data.value = fallback
        if (!quiet) error.value = e
        // eslint-disable-next-line no-console
        console.warn('[useResource] using fallback:', e?.message || e)
      } else {
        error.value = e
      }
    } finally {
      if (reqId === lastReqId) loading.value = false
    }
  }

  onMounted(refresh)
  if (key !== undefined && isRef(key)) watch(key, refresh)

  return { data, loading, error, refresh }
}
