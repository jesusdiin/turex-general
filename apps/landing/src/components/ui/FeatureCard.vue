<script setup lang="ts">
defineProps<{
  title: string
  description: string
  step?: number
}>()
</script>

<template>
  <div class="feature-card bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
    <div v-if="step" class="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-heading font-bold text-lg mb-4">
      {{ step }}
    </div>
    <div v-else class="mb-4">
      <slot name="icon" />
    </div>
    <h3 class="text-xl font-bold text-gray-900 mb-2 font-heading">{{ title }}</h3>
    <p class="text-gray-500 leading-relaxed">{{ description }}</p>
  </div>
</template>
