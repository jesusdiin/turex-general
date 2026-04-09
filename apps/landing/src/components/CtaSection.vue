<script setup lang="ts">
import { onMounted } from 'vue'
import AppButton from './ui/AppButton.vue'
import { useScrollAnimation } from '../composables/useScrollAnimation'

const { fadeInUp } = useScrollAnimation()

onMounted(() => {
  fadeInUp('.cta-content')
})
</script>

<template>
  <section id="cta" class="py-20 md:py-28 px-4 sm:px-6 bg-gradient-to-br from-blue-900 to-blue-700 relative overflow-hidden">
    <!-- Background decoration -->
    <div class="absolute inset-0 opacity-10">
      <div class="absolute top-10 right-20 w-64 h-64 rounded-full bg-yellow-400 blur-3xl"></div>
      <div class="absolute bottom-10 left-20 w-48 h-48 rounded-full bg-blue-400 blur-3xl"></div>
    </div>

    <div class="cta-content relative z-10 max-w-3xl mx-auto text-center">
      <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight font-heading mb-4">
        El Mundial es en <span class="text-yellow-400">2 meses</span>.<br>
        Tu negocio puede estar listo hoy.
      </h2>
      <p class="text-blue-100 text-lg md:text-xl mb-10">
        Registrate en minutos. Solo necesitas WhatsApp.
      </p>

      <div class="flex flex-col sm:flex-row gap-4 justify-center mb-12">
        <AppButton
          variant="whatsapp"
          size="lg"
          href="https://wa.me/5217405610966?text=Hola%2C%20quiero%20registrar%20mi%20negocio"
        >
          Registra tu negocio por WhatsApp
        </AppButton>
      </div>

      <!-- Email capture for tourists -->
      <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 md:p-8 max-w-lg mx-auto">
        <p class="text-white font-heading font-semibold mb-4">
          ¿Eres turista? Pronto lanzamos la app.
        </p>
        <form class="flex flex-col sm:flex-row gap-3" @submit.prevent>
          <input
            type="email"
            placeholder="tu@email.com"
            class="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <AppButton variant="yellow" size="md">
            Avisame
          </AppButton>
        </form>
      </div>
    </div>
  </section>
</template>
