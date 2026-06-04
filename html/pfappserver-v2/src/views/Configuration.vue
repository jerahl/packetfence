<script setup>
// System > Configuration — compliance, integration, network & system
// settings. The two-pane workspace lives in ./configuration/ConfigWorkspace;
// this view supplies the SYSTEM_TREE slice (everything except the "Policies
// and Access Control" group, which now lives under Govern > Policies).
import Icon from '@/components/Icon.vue'
import ConfigWorkspace from './configuration/ConfigWorkspace.vue'
import { SYSTEM_TREE } from './configuration/data.js'
</script>

<template>
  <div class="page" style="max-width: 1480px">
    <div class="page-head">
      <div>
        <div class="page-title">Configuration</div>
        <div class="page-sub">Compliance, integration, network & system settings</div>
      </div>
      <div class="page-tools">
        <button class="btn"><Icon name="download" :size="13" /> Export config</button>
        <button class="btn primary"><Icon name="bolt" :size="13" /> Apply changes</button>
      </div>
    </div>

    <ConfigWorkspace :tree="SYSTEM_TREE" />
  </div>
</template>
