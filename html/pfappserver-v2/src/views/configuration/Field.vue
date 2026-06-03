<script setup>
// Single form-field renderer for the Configuration workspace.
// `field` is a tuple from CFG_FORMS in `data.js`:
//   [label, hint, kind, value, ...rest]
// where `kind` is one of: text | mono | password | select | toggle | segmented.
import { ref } from 'vue'

const props = defineProps({
  field: { type: Array, required: true },
})

const [label, hint, kind, value, extra] = props.field

// Local-edited state — driven by the field's default value. This is
// the same convention the design used (defaultValue=…) and lets the
// Configuration shell stay stateless about individual fields. A real
// save handler will read these refs back later.
const text = ref(typeof value === 'string' ? value : '')
const sel = ref(Array.isArray(value) ? value[0] : value)
const toggle = ref(!!value)
const seg = ref(extra ?? (Array.isArray(value) ? value[0] : ''))
</script>

<template>
  <div class="label-h">
    <div class="lbl">{{ label }}</div>
    <div class="hint">{{ hint }}</div>
  </div>
  <div>
    <input v-if="kind === 'text'" class="input" v-model="text" />
    <input v-else-if="kind === 'mono'" class="input mono" v-model="text" />
    <input v-else-if="kind === 'password'" class="input mono" type="password" v-model="text" />
    <select v-else-if="kind === 'select'" class="select" v-model="sel">
      <option v-for="o in value" :key="o" :value="o">{{ o }}</option>
    </select>
    <label v-else-if="kind === 'toggle'" :class="['toggle', { on: toggle }]" @click="toggle = !toggle">
      <span class="toggle-track"><span class="toggle-thumb" /></span>
      <span style="font-size: 12px; color: var(--text-mid)">{{ toggle ? 'Enabled' : 'Disabled' }}</span>
    </label>
    <div v-else-if="kind === 'segmented'" class="segmented">
      <button v-for="o in value" :key="o" :class="{ on: o === seg }" @click="seg = o">{{ o }}</button>
    </div>
  </div>
</template>
