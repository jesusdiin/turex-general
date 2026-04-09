<script setup lang="ts">
import { onMounted } from 'vue'
import SectionHeading from './ui/SectionHeading.vue'
import FeatureCard from './ui/FeatureCard.vue'
import { useScrollAnimation } from '../composables/useScrollAnimation'

const { fadeInUp, staggerCards } = useScrollAnimation()

onMounted(() => {
  fadeInUp('.business-heading')
  staggerCards('.business-step', '.business-steps')
  fadeInUp('.business-callout')
})
</script>

<template>
  <section id="negocios" class="py-20 md:py-28 px-4 sm:px-6">
    <div class="max-w-6xl mx-auto">
      <div class="business-heading">
        <SectionHeading
          title="Registrate en 5 minutos"
          subtitle="Sin apps, sin formularios. Solo WhatsApp."
        />
      </div>

      <div class="business-steps grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <FeatureCard
          class="business-step"
          :step="1"
          title="Manda un WhatsApp"
          description="Escribenos y un asistente te guia paso a paso por el registro."
        />
        <FeatureCard
          class="business-step"
          :step="2"
          title="Cuentanos de tu negocio"
          description="Nombre, que vendes, donde estas. Asi de simple."
        />
        <FeatureCard
          class="business-step"
          :step="3"
          title="Aparece en TUREX"
          description="Turistas de todo el mundo te encuentran. Tu atiende como siempre."
        />
      </div>

      <!-- Callout -->
      <div class="business-callout max-w-2xl mx-auto">
        <div class="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-6 md:p-8 text-center">
          <p class="text-lg md:text-xl font-heading font-semibold text-gray-900">
            ¿No tienes pagina web? ¿No usas redes sociales?
          </p>
          <p class="text-lg md:text-xl font-heading font-bold text-yellow-500 mt-2">
            No importa. Si tienes WhatsApp, puedes estar en TUREX.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
