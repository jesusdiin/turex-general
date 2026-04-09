<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  light?: boolean
}>()
</script>

<template>
  <div class="text-center mb-12 md:mb-16">
    <h2
      class="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight"
      :class="light ? 'text-white' : 'text-gray-900'"
    >
      {{ title }}
    </h2>
    <p
      v-if="subtitle"
      class="mt-4 text-lg md:text-xl max-w-2xl mx-auto"
      :class="light ? 'text-blue-100' : 'text-gray-500'"
    >
      {{ subtitle }}
    </p>
  </div>
</template>
