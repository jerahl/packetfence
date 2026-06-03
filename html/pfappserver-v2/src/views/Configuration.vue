<script setup>
// System > Configuration — two-pane workspace ported from the design.
// Left rail = grouped nav tree (CFG_TREE in ./configuration/data.js).
// Right pane = one of three things, dispatched by the active leaf id:
//   1. A list table  (CFG_VIEWS[id])     — generic renderer inline below.
//   2. A form        (CFG_FORMS[id])     — generic renderer inline below.
//   3. A custom view (CFG_CUSTOM_IDS)    — its own .vue file in
//                                          ./configuration/.
import { computed, ref, shallowRef } from 'vue'
import Icon from '@/components/Icon.vue'
import Field from './configuration/Field.vue'
import Cluster from './configuration/Cluster.vue'
import Services from './configuration/Services.vue'
import Maintenance from './configuration/Maintenance.vue'
import SSL from './configuration/SSL.vue'
import AdminAccess from './configuration/AdminAccess.vue'
import Database from './configuration/Database.vue'
import { CFG_TREE, CFG_VIEWS, CFG_FORMS, CFG_CUSTOM_IDS, chipFor } from './configuration/data.js'

const CUSTOM = { cluster: Cluster, services: Services, maintenance: Maintenance, ssl: SSL, adminaccess: AdminAccess, database: Database }

const active = ref('roles')
const collapsed = shallowRef({}) // group label -> true when hidden

const groupOf = computed(() => CFG_TREE.find(g => g.items.some(i => i.id === active.value)))
const leaf    = computed(() => groupOf.value?.items.find(i => i.id === active.value))

const listView = computed(() => CFG_VIEWS[active.value])
const formView = computed(() => CFG_FORMS[active.value])
const customView = computed(() => CFG_CUSTOM_IDS.has(active.value) ? CUSTOM[active.value] : null)

const title = computed(() => listView.value?.title || formView.value?.title || leaf.value?.label)
const sub   = computed(() => listView.value?.sub   || formView.value?.sub)

function toggleGroup(g) {
  collapsed.value = { ...collapsed.value, [g]: !collapsed.value[g] }
}
</script>

<template>
  <div class="page" style="max-width: 1480px">
    <div class="page-head">
      <div>
        <div class="page-title">Configuration</div>
        <div class="page-sub">Policies, compliance, integration & system settings</div>
      </div>
      <div class="page-tools">
        <button class="btn"><Icon name="download" :size="13" /> Export config</button>
        <button class="btn primary"><Icon name="bolt" :size="13" /> Apply changes</button>
      </div>
    </div>

    <div class="cfg">
      <!-- Nav rail: collapsible groups, badge counts, active rail. -->
      <aside class="cfg-nav">
        <div v-for="g in CFG_TREE" :key="g.group" class="cfg-group">
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

      <!-- Main pane: breadcrumb → title → body. -->
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
  </div>
</template>

<style scoped>
/* Two-pane layout with a sticky nav rail. Direct port of the design's
   .cfg / .cfg-* rules — scoped here so they're guaranteed to apply
   regardless of how the global cascade settles. */
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
