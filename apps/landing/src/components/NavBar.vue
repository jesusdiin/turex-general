<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { PhList, PhX } from '@phosphor-icons/vue'
import AppButton from './ui/AppButton.vue'

const scrolled = ref(false)
const mobileOpen = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > 40
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))

const links = [
  { label: 'Turistas', href: '#turistas' },
  { label: 'Negocios', href: '#negocios' },
  { label: 'Beneficios', href: '#beneficios' },
]

function closeMenu() {
  mobileOpen.value = false
}
</script>

<template>
  <nav
    aria-label="Navegacion principal"
    class="fixed top-0 left-0 right-0 z-50 transition-[background-color,box-shadow,border-color] duration-500"
    :class="scrolled
      ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100'
      : 'bg-transparent'"
  >
    <div class="max-w-7xl mx-auto px-6 md:px-10 h-20 flex items-center justify-between">
      <!-- Logo -->
      <a href="#" class="font-heading font-extrabold text-2xl tracking-tight transition-colors duration-300" :class="scrolled ? 'text-blue-900' : 'text-white'">
        TUREX
      </a>

      <!-- Desktop links -->
      <div class="hidden md:flex items-center gap-10">
        <a
          v-for="l in links"
          :key="l.href"
          :href="l.href"
          class="text-sm font-medium transition-colors duration-200 rounded-md px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          :class="scrolled ? 'text-gray-500 hover:text-blue-900' : 'text-white/70 hover:text-white'"
        >
          {{ l.label }}
        </a>
        <AppButton variant="yellow" size="sm" href="https://wa.me/5217405610966?text=Hola%2C%20quiero%20registrar%20mi%20negocio">
          Registra tu negocio
        </AppButton>
      </div>

      <!-- Mobile hamburger -->
      <button
        class="md:hidden p-2 rounded-lg transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        :class="scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'"
        :aria-label="mobileOpen ? 'Cerrar menu' : 'Abrir menu'"
        :aria-expanded="mobileOpen"
        @click="mobileOpen = !mobileOpen"
      >
        <PhX v-if="mobileOpen" :size="24" weight="bold" aria-hidden="true" />
        <PhList v-else :size="24" weight="bold" aria-hidden="true" />
      </button>
    </div>

    <!-- Mobile menu -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="mobileOpen" class="md:hidden bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-lg">
        <div class="px-6 py-6 flex flex-col gap-4">
          <a
            v-for="l in links"
            :key="l.href"
            :href="l.href"
            class="text-gray-700 font-medium py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            @click="closeMenu"
          >
            {{ l.label }}
          </a>
          <AppButton variant="yellow" size="sm" href="https://wa.me/5217405610966?text=Hola%2C%20quiero%20registrar%20mi%20negocio">
            Registra tu negocio
          </AppButton>
        </div>
      </div>
    </Transition>
  </nav>
</template>
