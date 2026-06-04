<script setup>
// Reusable two-pane configuration workspace: a grouped nav rail on the left
// and a right pane that dispatches each leaf to a list table, a form, or a
// custom view. Extracted from Configuration.vue so the same workspace can be
// reused for a subset of the tree elsewhere (Govern > Policies hosts the
// "Policies and Access Control" group through this same component).
//
// Props:
//   tree         array of { group, icon, items: [{ id, label, badge? }] }
//   customViews  optional map of leaf id -> component, merged over the six
//                built-in custom views (lets Policies supply its rich
//                Connection Profiles editor for the `profiles` leaf).
import { computed, ref, shallowRef, watch } from 'vue'
import Icon from '@/components/Icon.vue'
import Field from './Field.vue'
import Cluster from './Cluster.vue'
import Services from './Services.vue'
import Maintenance from './Maintenance.vue'
import SSL from './SSL.vue'
import AdminAccess from './AdminAccess.vue'
import Database from './Database.vue'
import { CFG_VIEWS, CFG_FORMS, chipFor } from './data.js'

const props = defineProps({
  tree: { type: Array, required: true },
  customViews: { type: Object, default: () => ({}) },
})

const BASE_CUSTOM = { cluster: Cluster, services: Services, maintenance: Maintenance, ssl: SSL, adminaccess: AdminAccess, database: Database }
const custom = computed(() => ({ ...BASE_CUSTOM, ...props.customViews }))

const firstLeaf = () => props.tree[0]?.items[0]?.id
const active = ref(firstLeaf())
const collapsed = shallowRef({}) // group label -> true when hidden

// If the tree swaps out (e.g. a different page reuses this component), keep
// the active leaf valid.
watch(() => props.tree, () => {
  const ok = props.tree.some(g => g.items.some(i => i.id === active.value))
  if (!ok) active.value = firstLeaf()
})

const groupOf = computed(() => props.tree.find(g => g.items.some(i => i.id === active.value)))
const leaf    = computed(() => groupOf.value?.items.find(i => i.id === active.value))

const listView = computed(() => (custom.value[active.value] ? null : CFG_VIEWS[active.value]))
const formView = computed(() => (custom.value[active.value] ? null : CFG_FORMS[active.value]))
const customView = computed(() => custom.value[active.value] || null)

const title = computed(() => CFG_VIEWS[active.value]?.title || CFG_FORMS[active.value]?.title || leaf.value?.label)
const sub   = computed(() => CFG_VIEWS[active.value]?.sub   || CFG_FORMS[active.value]?.sub)

function toggleGroup(g) {
  collapsed.value = { ...collapsed.value, [g]: !collapsed.value[g] }
}
</script>

<template>
  <div class="cfg">
    <!-- Nav rail: collapsible groups, badge counts, active rail. -->
    <aside class="cfg-nav">
      <div v-for="g in tree" :key="g.group" class="cfg-group">
        <div class="cfg-group-h" @click="toggleGroup(g.group)">
          <Icon :name="collapsed[g.group] ? 'chevR' : 'chevD'" :size="11" style="color: var(--text-faint)" />
          <Icon :name="g.icon" :size="13" />
          <span>{{ g.group }}</span>
        </div>
        <template v-if="!collapsed[g.group]">
          <div
            v-for="it in g.items" :key="it.id"
            :class="['cfg-leaf', { active: active === it.id }]"
            @click="active = it.id"
          >
            <span>{{ it.label }}</span>
            <span v-if="it.badge" class="badge">{{ it.badge }}</span>
          </div>
        </template>
      </div>
    </aside>

    <!-- Main pane: breadcrumb -> title -> body. -->
    <div class="cfg-main">
      <div class="cfg-bc">
        <span>{{ groupOf?.group }}</span>
        <Icon name="chevR" :size="11" />
        <span class="cur">{{ leaf?.label }}</span>
      </div>
      <div class="cfg-title-row">
        <div>
          <div class="cfg-title">{{ title }}</div>
          <div v-if="sub" class="cfg-sub">{{ sub }}</div>
        </div>
      </div>

      <!-- Custom view -->
      <component v-if="customView" :is="customView" />

      <!-- List view (generic table) -->
      <div v-else-if="listView" class="tbl-wrap">
        <div class="tbl-toolbar">
          <div class="tbl-search">
            <Icon name="search" />
            <input :placeholder="`Search ${title.toLowerCase()}…`" />
          </div>
          <button class="tbl-filter"><Icon name="filter" :size="12" /> Type</button>
          <div style="margin-left:auto">
            <button class="btn sm primary">
              <Icon name="plus" :size="12" /> {{ listView.list.newLabel }}
            </button>
          </div>
        </div>
        <div style="overflow-x:auto">
          <table class="tbl">
            <thead>
              <tr>
                <th v-if="listView.list.reorder" class="ck"></th>
                <th v-for="(c, i) in listView.list.cols" :key="i">{{ c }}</th>
                <th class="actions-col"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, ri) in listView.list.rows" :key="ri">
                <td v-if="listView.list.reorder" class="ck">
                  <Icon name="drag" style="color: var(--text-faint)" />
                </td>
                <td
                  v-for="(cell, ci) in r" :key="ci"
                  :class="ci === listView.list.monoCol ? 'mono' : ''"
                  :style="
                    ci === listView.list.accentCol
                      ? { fontWeight: 500 }
                      : (ci === listView.list.statusCol || ci === listView.list.chipCol
                          ? {}
                          : { color: 'var(--text-mid)' })
                  "
                >
                  <template v-if="ci === listView.list.statusCol">
                    <span :class="['chip', chipFor(cell)]">
                      <span v-if="chipFor(cell) === 'ok'" class="pulse" />{{ cell }}
                    </span>
                  </template>
                  <template v-else-if="ci === listView.list.chipCol">
                    <span class="chip info">{{ cell }}</span>
                  </template>
                  <template v-else>{{ cell }}</template>
                </td>
                <td class="actions-col">
                  <button class="btn sm ghost"><Icon name="more" :size="13" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="tbl-foot">
          <span>Showing <b class="num">{{ listView.list.rows.length }}</b> entries</span>
          <span style="color: var(--text-faint)">
            Stored in <span class="mono">/usr/local/pf/conf</span>
          </span>
        </div>
      </div>

      <!-- Form view (generic field grid) -->
      <div v-else-if="formView" class="card" style="max-width: 920px">
        <div class="card-head">
          <div class="card-title">{{ formView.title }}</div>
          <div class="card-tools">
            <button class="btn sm">Reset</button>
            <button class="btn sm primary"><Icon name="check" :size="12" /> Save</button>
          </div>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <Field v-for="(f, i) in formView.fields" :key="i" :field="f" />
          </div>
        </div>
      </div>

      <!-- Fallback: a section we haven't filled in yet. -->
      <div v-else class="card">
        <div class="empty">Configuration section.</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Two-pane layout with a sticky nav rail. Ported from the design's .cfg /
   .cfg-* rules — scoped here so they apply regardless of the global cascade. */
.cfg { display: grid; grid-template-columns: 256px 1fr; gap: 16px; align-items: start; }
.cfg-nav {
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 6px;
  position: sticky;
  top: 0;
  max-height: calc(100vh - 150px);
  overflow-y: auto;
}
.cfg-group { margin-bottom: 2px; }
.cfg-group-h {
  display: flex; align-items: center; gap: 7px;
  padding: 9px 8px 5px;
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em;
  color: var(--text-faint); font-weight: 600;
  cursor: pointer; user-select: none;
}
.cfg-group-h:hover { color: var(--text-dim); }
.cfg-group-h > span { flex: 1; }
.cfg-leaf {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px 6px 28px;
  border-radius: var(--radius);
  font-size: 12.5px; color: var(--text-mid);
  cursor: pointer; position: relative;
}
.cfg-leaf > span:first-child { flex: 1; }
.cfg-leaf:hover { background: var(--bg-hover); color: var(--text); }
.cfg-leaf.active { background: var(--accent-soft); color: var(--accent); font-weight: 500; }
.cfg-leaf.active::before {
  content: "";
  position: absolute;
  left: 14px; top: 8px; bottom: 8px; width: 2px;
  background: var(--accent); border-radius: 2px;
}
.cfg-leaf .badge {
  font-size: 10px;
  font-family: var(--font-mono);
  background: var(--bg-elev-2);
  color: var(--text-dim);
  padding: 0 6px;
  border-radius: 10px;
  border: 1px solid var(--border);
}
.cfg-leaf.active .badge {
  background: transparent; color: var(--accent); border-color: var(--accent-soft);
}
.cfg-main { min-width: 0; }
.cfg-bc { display: flex; align-items: center; gap: 7px; font-size: 11px; color: var(--text-dim); margin-bottom: 6px; }
.cfg-bc .cur { color: var(--text-mid); font-weight: 500; }
.cfg-title-row { display: flex; align-items: flex-end; gap: 16px; margin-bottom: 14px; }
.cfg-title { font-size: 16px; font-weight: 600; letter-spacing: -0.01em; }
.cfg-sub { font-size: 12px; color: var(--text-dim); margin-top: 2px; }
</style>
