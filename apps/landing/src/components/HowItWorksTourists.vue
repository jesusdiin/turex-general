<script setup lang="ts">
import { onMounted } from 'vue'
import SectionHeading from './ui/SectionHeading.vue'
import FeatureCard from './ui/FeatureCard.vue'
import { useScrollAnimation } from '../composables/useScrollAnimation'

const { fadeInUp, staggerCards } = useScrollAnimation()

onMounted(() => {
  fadeInUp('.tourists-heading')
  staggerCards('.tourist-step', '.tourist-steps')
})
</script>

<template>
  <section id="turistas" class="py-20 md:py-28 px-4 sm:px-6 bg-white">
    <div class="max-w-6xl mx-auto">
      <div class="tourists-heading">
        <SectionHeading
          title="Vive Mexico de verdad"
          subtitle="Descubre experiencias locales autenticas, lejos de lo turistico de siempre."
        />
      </div>

      <div class="tourist-steps grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard
          class="tourist-step"
          :step="1"
          title="Explora"
          description="Descubre fondas, mercados, artesanos y experiencias cerca de ti o en cualquier ciudad de Mexico."
        />
        <FeatureCard
          class="tourist-step"
          :step="2"
          title="Conecta"
          description="Contacta directo al negocio. Sin intermediarios, sin comisiones infladas."
        />
        <FeatureCard
          class="tourist-step"
          :step="3"
          title="Vive"
          description="Come mole en una cocina de barrio, compra alebrijes del artesano, no de la tienda del aeropuerto."
        />
      </div>
    </div>
  </section>
</template>
