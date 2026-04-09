<script setup lang="ts">
defineProps<{
  variant?: 'blue' | 'yellow' | 'whatsapp' | 'ghost'
  href?: string
  size?: 'sm' | 'md' | 'lg'
}>()
</script>

<template>
  <component
    :is="href ? 'a' : 'button'"
    :href="href"
    :target="href?.startsWith('http') ? '_blank' : undefined"
    :rel="href?.startsWith('http') ? 'noopener noreferrer' : undefined"
    class="inline-flex items-center justify-center font-heading font-semibold rounded-xl transition-all duration-300 cursor-pointer"
    :class="[
      {
        'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/25 hover:-translate-y-0.5': variant === 'blue' || !variant,
        'bg-yellow-400 text-gray-900 hover:bg-yellow-500 hover:shadow-lg hover:shadow-yellow-400/25 hover:-translate-y-0.5': variant === 'yellow',
        'bg-green-500 text-white hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 hover:-translate-y-0.5': variant === 'whatsapp',
        'border-2 border-white/30 text-white hover:bg-white/10': variant === 'ghost',
      },
      {
        'px-4 py-2 text-sm': size === 'sm',
        'px-6 py-3 text-base': size === 'md' || !size,
        'px-8 py-4 text-lg': size === 'lg',
      },
    ]"
  >
    <slot />
  </component>
</template>
