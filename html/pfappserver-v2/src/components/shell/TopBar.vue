<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTweaksStore } from '@/stores/tweaks'
import { useUiStore } from '@/stores/ui'
import Icon from '@/components/Icon.vue'

const tweaks = useTweaksStore()
const ui = useUiStore()
const route = useRoute()

const crumbs = computed(() => route.meta?.crumbs ?? ['—'])
</script>

<template>
  <header class="topbar">
    <button class="icon-btn" @click="tweaks.toggleCollapsed(); tweaks.persist()"
            :title="tweaks.collapsed ? 'Expand sidebar' : 'Collapse sidebar'">
      <Icon :name="tweaks.collapsed ? 'expand' : 'collapse'" />
    </button>
    <div class="crumbs">
      <template v-for="(c, i) in crumbs" :key="i">
        <span v-if="i > 0" class="sep"><Icon name="chevR" :size="12" /></span>
        <span :class="{ cur: i === crumbs.length - 1 }">{{ c }}</span>
      </template>
    </div>
    <button class="search" @click="ui.cmdkOpen = true">
      <Icon name="search" />
      <span>Search nodes, users, switches…</span>
      <span class="kbd">⌘K</span>
    </button>
    <button class="icon-btn" @click="tweaks.toggleTheme(); tweaks.persist()" title="Toggle theme">
      <Icon :name="tweaks.theme === 'dark' ? 'globe' : 'shield'" />
    </button>
    <button class="icon-btn" title="Notifications">
      <Icon name="bell" />
      <span class="pip" />
    </button>
    <button class="icon-btn" title="Settings">
      <Icon name="settings" />
    </button>
    <div class="avatar" title="admin">KO</div>
  </header>
</template>
