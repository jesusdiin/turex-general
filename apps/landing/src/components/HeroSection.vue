<script setup lang="ts">
import { onMounted } from 'vue'
import AppButton from './ui/AppButton.vue'
import { useScrollAnimation } from '../composables/useScrollAnimation'

const { parallax } = useScrollAnimation()

onMounted(() => {
  parallax('.hero-bg-layer', 0.4)
})
</script>

<template>
  <section id="hero" class="relative min-h-screen flex items-center justify-center overflow-hidden">
    <!-- Background -->
    <div class="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-900 to-blue-700">
      <div class="hero-bg-layer absolute inset-0 opacity-10">
        <div class="absolute top-20 left-10 w-72 h-72 rounded-full bg-yellow-400 blur-3xl"></div>
        <div class="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-blue-500 blur-3xl"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-yellow-300 blur-3xl"></div>
      </div>
      <!-- Grid pattern overlay -->
      <div class="absolute inset-0 opacity-5" style="background-image: radial-gradient(circle, white 1px, transparent 1px); background-size: 40px 40px;"></div>
    </div>

    <!-- Content -->
    <div class="relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto">
      <div class="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-8">
        <span class="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
        <span class="text-blue-100 text-sm font-medium">Mundial 2026 en Mexico</span>
      </div>

      <h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
        Que el turismo<br>
        <span class="text-yellow-400">llegue a todos</span>
      </h1>

      <p class="text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto mb-10 leading-relaxed">
        TUREX conecta a turistas con negocios locales autenticos — fondas, artesanos, guias — mas alla de los estadios.
      </p>

      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <AppButton variant="yellow" size="lg" href="#turistas">
          Soy turista
        </AppButton>
        <AppButton variant="ghost" size="lg" href="https://wa.me/5217405610966?text=Hola%2C%20quiero%20registrar%20mi%20negocio" >
          Tengo un negocio
        </AppButton>
      </div>
    </div>

    <!-- Scroll indicator -->
    <div class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
      <div class="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
        <div class="w-1.5 h-3 rounded-full bg-white/60"></div>
      </div>
    </div>
  </section>
</template>
