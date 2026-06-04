<script setup>
// Connection Profiles editor — the rich Match → Authenticate → Authorize
// flow + edit form. Rendered as the custom view for the `profiles` leaf of
// the Policies workspace (was the body of the standalone Policies.vue before
// the "Policies and Access Control" config section moved under Govern).
// Mock-only for now; PF's endpoint is /api/v1/config/connection_profiles.
import { computed, ref } from 'vue'
import { NAC_DATA } from '@/data/mock'
import Icon from '@/components/Icon.vue'

const PORTAL_OPTIONS = ['Silent', 'Self-service', 'Captive', 'MAB', 'Remediation']

const profiles = NAC_DATA.profiles
const sel = ref(profiles[0].id)
const profile = computed(() => profiles.find(p => p.id === sel.value) || profiles[0])

// Light local copy of editable fields. Real save will hit the backend;
// for now Cancel restores from the source profile and Save no-ops.
const draft = ref({})
function loadDraft(p) {
  draft.value = {
    name: p.name,
    description: `Profile for ${p.name}. Auto-generated description.`,
    match: p.match,
    role: p.role,
    portal: p.portal,
    sessionTimeout: '8h',
    reauthInterval: '30m',
    posture: true,
    accounting: true,
    bypassOnFail: false,
    sources: [...p.sources],
  }
}
loadDraft(profile.value)
function pickProfile(p) {
  sel.value = p.id
  loadDraft(p)
}
function cancelEdit() { loadDraft(profile.value) }
function saveEdit() {
  // eslint-disable-next-line no-console
  console.info('[Policies] save (mock) for', profile.value.id, JSON.parse(JSON.stringify(draft.value)))
}
function removeSource(i) { draft.value.sources.splice(i, 1) }

function sourceKind(s) {
  if (s.includes('AD'))     return 'Active Directory'
  if (s.includes('SMS'))    return 'SMS OTP'
  if (s.includes('Sponsor'))return 'Email sponsor'
  return 'LDAP'
}
</script>

<template>
  <div style="display:grid; grid-template-columns: 360px 1fr; gap: 14px">
    <!-- Profile list rail -->
    <div class="card">
      <div class="card-head">
        <div class="card-title">Profiles</div>
        <div class="card-sub">Evaluated by priority</div>
        <div class="card-tools"><button class="btn sm ghost"><Icon name="plus" :size="13" /></button></div>
      </div>
      <div style="max-height: calc(100vh - 280px); overflow:auto">
        <div
          v-for="p in profiles" :key="p.id"
          @click="pickProfile(p)"
          :style="{
            display:'flex', alignItems:'center', gap:'10px',
            padding:'12px 14px',
            borderTop:'1px solid var(--border)',
            cursor:'pointer',
            background: sel === p.id ? 'var(--accent-soft)' : 'transparent',
          }"
        >
          <Icon name="drag" style="color: var(--text-faint)" />
          <div style="flex:1; min-width:0">
            <div style="display:flex; align-items:center; gap:6px">
              <span style="font-weight:500; font-size:13px">{{ p.name }}</span>
              <span v-if="!p.enabled" class="chip">disabled</span>
            </div>
            <div class="mono" style="color:var(--text-dim); font-size:11px; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">
              {{ p.match }}
            </div>
          </div>
          <div style="text-align:right; color:var(--text-dim); font-size:11px; font-family:var(--font-mono)">
            <div>#{{ p.priority }}</div>
            <div>{{ p.devices.toLocaleString() }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail column -->
    <div style="display:flex; flex-direction:column; gap:14px">
      <!-- Flow card -->
      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">{{ profile.name }}</div>
            <div class="card-sub">
              Priority #{{ profile.priority }} · {{ profile.devices.toLocaleString() }} active devices · matches in 4.2ms avg
            </div>
          </div>
          <div class="card-tools">
            <span :class="['toggle', { on: profile.enabled }]">
              <span class="toggle-track"><span class="toggle-thumb" /></span>
              <span style="font-size:12px">{{ profile.enabled ? 'Enabled' : 'Disabled' }}</span>
            </span>
            <button class="btn sm"><Icon name="copy" :size="12" /> Duplicate</button>
            <button class="btn sm danger"><Icon name="trash" :size="12" /></button>
          </div>
        </div>
        <div class="card-body">
          <div class="flow">
            <div class="node">
              <h5>1 · Match</h5>
              <div class="val mono">{{ profile.match }}</div>
            </div>
            <div class="arrow"><Icon name="arrowR" /></div>
            <div class="node">
              <h5>2 · Authenticate</h5>
              <div class="val">{{ profile.sources.join(' → ') }}</div>
            </div>
            <div class="arrow"><Icon name="arrowR" /></div>
            <div class="node">
              <h5>3 · Authorize</h5>
              <div class="val"><span class="chip accent">{{ profile.role }}</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Edit form -->
      <div class="card">
        <div class="card-head">
          <div class="card-title">Configuration</div>
          <div class="card-tools">
            <button class="btn sm" @click="cancelEdit">Cancel</button>
            <button class="btn sm primary" @click="saveEdit"><Icon name="check" :size="12" /> Save changes</button>
          </div>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="label-h">
              <div class="lbl">Name</div>
              <div class="hint">Shown in audit logs and reports.</div>
            </div>
            <div><input class="input" v-model="draft.name" /></div>

            <div class="label-h">
              <div class="lbl">Description</div>
              <div class="hint">Optional. Visible to admins only.</div>
            </div>
            <div><textarea class="textarea" v-model="draft.description" /></div>

            <div class="label-h">
              <div class="lbl">Match expression</div>
              <div class="hint">PF-QL. Evaluated against connection metadata.</div>
            </div>
            <div>
              <input class="input mono" v-model="draft.match" />
              <div class="pill-stack" style="margin-top:8px">
                <span class="chip">ssid</span>
                <span class="chip">switch</span>
                <span class="chip">vlan</span>
                <span class="chip">port</span>
                <span class="chip">lldp.cap</span>
                <span class="chip">radius.calling-station-id</span>
                <span class="chip">time.window</span>
              </div>
            </div>

            <div class="label-h">
              <div class="lbl">Authentication sources</div>
              <div class="hint">Tried in order. First match wins.</div>
            </div>
            <div>
              <div
                v-for="(s, i) in draft.sources" :key="i"
                style="display:flex; align-items:center; gap:8px; padding:8px 10px; border:1px solid var(--border); border-radius:var(--radius); margin-bottom:6px"
              >
                <Icon name="drag" style="color:var(--text-faint)" />
                <span class="mono" style="font-size:12px; color:var(--text-dim)">{{ i + 1 }}.</span>
                <span style="font-weight:500">{{ s }}</span>
                <span class="chip info" style="margin-left:auto">{{ sourceKind(s) }}</span>
                <button class="btn sm ghost" @click="removeSource(i)"><Icon name="x" :size="12" /></button>
              </div>
              <button class="btn sm"><Icon name="plus" :size="12" /> Add source</button>
            </div>

            <div class="label-h">
              <div class="lbl">Default role</div>
              <div class="hint">Used if no rule overrides.</div>
            </div>
            <div>
              <select class="select" v-model="draft.role">
                <option v-for="r in NAC_DATA.roles" :key="r.name" :value="r.name">
                  {{ r.name }}  (VLAN {{ r.vlan }})
                </option>
              </select>
            </div>

            <div class="label-h">
              <div class="lbl">Portal</div>
              <div class="hint">Captive, self-service, MAB or silent.</div>
            </div>
            <div>
              <div class="segmented">
                <button
                  v-for="p in PORTAL_OPTIONS" :key="p"
                  :class="{ on: draft.portal === p }"
                  @click="draft.portal = p"
                >{{ p }}</button>
              </div>
            </div>

            <div class="label-h">
              <div class="lbl">Session options</div>
              <div class="hint">Re-auth & timeouts.</div>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px">
              <div>
                <div style="font-size:11px; color:var(--text-dim); margin-bottom:4px">Session timeout</div>
                <input class="input mono" v-model="draft.sessionTimeout" />
              </div>
              <div>
                <div style="font-size:11px; color:var(--text-dim); margin-bottom:4px">Re-auth interval</div>
                <input class="input mono" v-model="draft.reauthInterval" />
              </div>
            </div>

            <div class="label-h">
              <div class="lbl">Advanced</div>
              <div class="hint">Posture checks, accounting, CoA.</div>
            </div>
            <div style="display:flex; flex-direction:column; gap:10px">
              <label :class="['toggle', { on: draft.posture }]" @click="draft.posture = !draft.posture">
                <span class="toggle-track"><span class="toggle-thumb" /></span>
                <span>Enforce posture check (AV, OS patch level)</span>
              </label>
              <label :class="['toggle', { on: draft.accounting }]" @click="draft.accounting = !draft.accounting">
                <span class="toggle-track"><span class="toggle-thumb" /></span>
                <span>Send RADIUS accounting</span>
              </label>
              <label :class="['toggle', { on: draft.bypassOnFail }]" @click="draft.bypassOnFail = !draft.bypassOnFail">
                <span class="toggle-track"><span class="toggle-thumb" /></span>
                <span>Bypass on captive-portal failure</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Match → Authenticate → Authorize flow visual. Kept scoped because it's
   only used here (and would conflict with anything else named 'flow'). */
.flow {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 18px;
  display: grid;
  grid-template-columns: 1fr 24px 1fr 24px 1fr;
  gap: 8px;
  align-items: center;
}
.flow .node {
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  text-align: center;
}
.flow .node h5 { margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); font-weight: 600; }
.flow .node .val { font-size: 13px; font-weight: 500; }
.flow .arrow { color: var(--text-faint); display: grid; place-items: center; }
</style>
