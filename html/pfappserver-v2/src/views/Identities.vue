<script setup>
// Identities — users + their devices, sources, MFA enrollment.
// Mock-only for now: PF's user/identity endpoints don't have a single
// "/users with devices count" route, so this lands behind /api/v1/users
// + a join in a follow-up.
import { computed } from 'vue'
import { NAC_DATA } from '@/data/mock'
import Icon from '@/components/Icon.vue'

const SOURCES = ['AD-Corp', 'AD-Corp', 'AD-Corp', 'Local', 'SMS-Twilio', 'Sponsor-Email']
const SEEN = ['just now', '12m ago', '3h ago', '1d ago', '2d ago', '5d ago']

// Derive the same shape the design renders, deterministically from index
// so the table is stable across reloads.
const users = computed(() =>
  NAC_DATA.users.map((u, i) => ({
    user: u,
    devices: 1 + (i * 7) % 5,
    role: NAC_DATA.roles[(i * 3) % NAC_DATA.roles.length].name,
    source: SOURCES[i % SOURCES.length],
    lastSeen: SEEN[i % SEEN.length],
    mfa: i % 3 !== 0,
    initials: u.slice(0, 2).toUpperCase(),
    avatarHue: (i * 47) % 360,
  })),
)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-title">Identities</div>
        <div class="page-sub">{{ users.length }} users across 4 sources · 87% MFA enrolled</div>
      </div>
      <div class="page-tools">
        <button class="btn"><Icon name="download" :size="13" /> Export</button>
        <button class="btn primary"><Icon name="plus" :size="13" /> Invite</button>
      </div>
    </div>

    <div class="tabs">
      <div class="t active">All users <span class="chip" style="margin-left:6px">{{ users.length }}</span></div>
      <div class="t">Sponsors</div>
      <div class="t">Guests <span class="chip" style="margin-left:6px">34</span></div>
      <div class="t">Service accounts</div>
    </div>

    <div class="tbl-wrap">
      <div class="tbl-toolbar">
        <div class="tbl-search"><Icon name="search" /><input placeholder="Search by username, email…" /></div>
        <button class="tbl-filter"><Icon name="filter" :size="12" /> Source</button>
        <button class="tbl-filter"><Icon name="filter" :size="12" /> Role</button>
        <button class="tbl-filter"><Icon name="filter" :size="12" /> MFA</button>
      </div>
      <table class="tbl">
        <thead>
          <tr>
            <th class="ck"><div class="checkbox" /></th>
            <th>Username</th>
            <th>Devices</th>
            <th>Role</th>
            <th>Source</th>
            <th>MFA</th>
            <th>Last seen</th>
            <th class="actions-col"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(u, i) in users" :key="i">
            <td class="ck"><div class="checkbox" /></td>
            <td>
              <span style="display:inline-flex; align-items:center; gap:10px">
                <span
                  :style="{
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: `linear-gradient(135deg, oklch(0.5 0.12 ${u.avatarHue}), oklch(0.7 0.12 ${(u.avatarHue + 60) % 360}))`,
                    color: '#fff', display: 'grid', placeItems: 'center',
                    fontSize: '10px', fontWeight: 600,
                  }"
                >{{ u.initials }}</span>
                <span style="font-weight:500">{{ u.user }}</span>
              </span>
            </td>
            <td class="mono">{{ u.devices }}</td>
            <td><span class="chip accent">{{ u.role }}</span></td>
            <td class="mono" style="color:var(--text-dim)">{{ u.source }}</td>
            <td>
              <span v-if="u.mfa" class="chip ok"><Icon name="check" :size="10" /> on</span>
              <span v-else class="chip warn"><Icon name="unlock" :size="10" /> off</span>
            </td>
            <td class="mono" style="color:var(--text-dim)">{{ u.lastSeen }}</td>
            <td class="actions-col"><button class="btn sm ghost"><Icon name="more" :size="13" /></button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
