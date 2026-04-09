<script setup lang="ts">
import { onMounted } from 'vue'
import SectionHeading from './ui/SectionHeading.vue'
import { useScrollAnimation } from '../composables/useScrollAnimation'

const { fadeInUp, staggerCards } = useScrollAnimation()

const benefits = [
  {
    icon: '💰',
    title: 'Sin comisiones',
    description: 'No cobramos por venta. Queremos que el dinero llegue a ti.',
  },
  {
    icon: '📲',
    title: 'Sin apps que descargar',
    description: 'Todo funciona por WhatsApp y web. Asi de facil.',
  },
  {
    icon: '🎉',
    title: 'Mas alla del Mundial',
    description: 'Dia de Muertos, Guelaguetza, Semana Santa... TUREX crece con cada evento.',
  },
  {
    icon: '🇲🇽',
    title: 'Hecho en Mexico',
    description: 'Disenado para la realidad de los negocios mexicanos.',
  },
]

onMounted(() => {
  fadeInUp('.benefits-heading')
  staggerCards('.benefit-card', '.benefits-grid')
})
</script>

<template>
  <section id="beneficios" class="py-20 md:py-28 px-4 sm:px-6 bg-white">
    <div class="max-w-6xl mx-auto">
      <div class="benefits-heading">
        <SectionHeading
          title="¿Por que TUREX?"
        />
      </div>

      <div class="benefits-grid grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <div
          v-for="b in benefits"
          :key="b.title"
          class="benefit-card bg-gray-50 rounded-2xl p-6 md:p-8 border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300"
        >
          <div class="text-4xl mb-4">{{ b.icon }}</div>
          <h3 class="text-xl font-bold text-gray-900 font-heading mb-2">{{ b.title }}</h3>
          <p class="text-gray-500 leading-relaxed">{{ b.description }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
