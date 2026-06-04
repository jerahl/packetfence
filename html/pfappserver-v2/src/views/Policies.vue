<script setup>
// Govern > Policies — now hosts the "Policies and Access Control" settings
// that previously lived under System > Configuration (roles, domains, realms,
// authentication sources, network devices, switch groups, connection
// profiles, self-service portal, filter engines). Rendered through the shared
// ConfigWorkspace; the `profiles` leaf uses the rich Connection Profiles
// editor as its custom view.
import Icon from '@/components/Icon.vue'
import ConfigWorkspace from './configuration/ConfigWorkspace.vue'
import ConnectionProfiles from './configuration/ConnectionProfiles.vue'
import { POLICY_TREE } from './configuration/data.js'

const customViews = { profiles: ConnectionProfiles }
</script>

<template>
  <div class="page" style="max-width: 1480px">
    <div class="page-head">
      <div>
        <div class="page-title">Policies</div>
        <div class="page-sub">Roles, authentication sources, connection profiles & access control</div>
      </div>
      <div class="page-tools">
        <button class="btn"><Icon name="download" :size="13" /> Export</button>
        <button class="btn primary"><Icon name="bolt" :size="13" /> Apply changes</button>
      </div>
    </div>

    <ConfigWorkspace :tree="POLICY_TREE" :custom-views="customViews" />
  </div>
</template>
