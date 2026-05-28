import { defineStore } from 'pinia'

// Transient UI state: which endpoint is open in the inspector, and whether
// the command palette is showing. Lives in Pinia so any view can open the
// inspector via `ui.openInspector(node)` without prop-drilling.
export const useUiStore = defineStore('ui', {
  state: () => ({
    cmdkOpen: false,
    inspectorNode: null,
  }),
  actions: {
    openInspector(node) { this.inspectorNode = node },
    closeInspector() { this.inspectorNode = null },
  },
})
