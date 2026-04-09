<script setup lang="ts">
import { onMounted } from 'vue'
import SectionHeading from './ui/SectionHeading.vue'
import { useScrollAnimation } from '../composables/useScrollAnimation'

const { fadeInUp, staggerCards, countUp } = useScrollAnimation()

onMounted(() => {
  fadeInUp('.problem-heading')
  countUp('.stat-number', 87)
  staggerCards('.problem-card', '.problem-cards')
})
</script>

<template>
  <section id="problema" class="py-20 md:py-28 px-4 sm:px-6">
    <div class="max-w-6xl mx-auto">
      <div class="problem-heading">
        <SectionHeading
          title="El turismo no llega a todos"
          subtitle="El capital turistico se concentra en las grandes ciudades. Los negocios locales quedan fuera."
        />
      </div>

      <!-- Stat highlight -->
      <div class="text-center mb-16">
        <div class="inline-flex flex-col items-center bg-blue-50 border border-blue-100 rounded-2xl px-8 py-6">
          <div class="flex items-baseline gap-1">
            <span class="stat-number text-5xl md:text-6xl font-bold text-blue-600 font-heading">0</span>
            <span class="text-3xl md:text-4xl font-bold text-blue-600 font-heading">%</span>
          </div>
          <p class="text-gray-500 mt-2 max-w-xs">del gasto turistico se concentra en las sedes oficiales</p>
        </div>
      </div>

      <!-- Problem cards -->
      <div class="problem-cards grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="problem-card bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
          <div class="text-4xl mb-4">🏟️</div>
          <h3 class="text-lg font-bold text-gray-900 font-heading mb-2">Solo 3 ciudades sede</h3>
          <p class="text-gray-500">Miles de negocios locales en todo Mexico esperan ser descubiertos por los turistas.</p>
        </div>
        <div class="problem-card bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
          <div class="text-4xl mb-4">🔍</div>
          <h3 class="text-lg font-bold text-gray-900 font-heading mb-2">Turistas buscan lo autentico</h3>
          <p class="text-gray-500">Quieren la fonda de la esquina, no la cadena del aeropuerto. Pero no saben donde encontrarlo.</p>
        </div>
        <div class="problem-card bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
          <div class="text-4xl mb-4">📱</div>
          <h3 class="text-lg font-bold text-gray-900 font-heading mb-2">Negocios invisibles</h3>
          <p class="text-gray-500">Sin pagina web, sin redes sociales. Los negocios informales no tienen presencia digital.</p>
        </div>
      </div>
    </div>
  </section>
</template>
