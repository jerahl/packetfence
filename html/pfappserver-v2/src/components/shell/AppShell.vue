<script setup>
import { useTweaksStore } from '@/stores/tweaks'
import { useUiStore } from '@/stores/ui'
import Sidebar from './Sidebar.vue'
import TopBar from './TopBar.vue'
import InspectorDrawer from '@/components/inspector/InspectorDrawer.vue'

const tweaks = useTweaksStore()
const ui = useUiStore()
</script>

<template>
  <div class="app" :data-collapsed="tweaks.collapsed">
    <Sidebar />
    <TopBar />
    <main class="main">
      <slot />
      <!-- Inspector lives inside <main> so the backdrop only dims the page,
           not the chrome (sidebar/top bar). Click backdrop or ESC to close. -->
      <div
        :class="['inspector-backdrop', { open: !!ui.inspectorNode }]"
        @click="ui.closeInspector()"
      />
      <InspectorDrawer />
    </main>
  </div>
</template>
