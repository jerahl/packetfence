<script setup>
// Shared status chip — same four states as the design.
defineProps({ status: { type: String, required: true } })
</script>

<template>
  <span v-if="status === 'registered'"   class="chip ok"><span class="pulse" />registered</span>
  <span v-else-if="status === 'unregistered'" class="chip warn">unregistered</span>
  <span v-else-if="status === 'pending'" class="chip info">pending</span>
  <span v-else-if="status === 'isolated'" class="chip bad">isolated</span>
  <span v-else class="chip">{{ status }}</span>
</template>
