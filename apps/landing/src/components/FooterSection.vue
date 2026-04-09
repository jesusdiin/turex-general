<template>
  <footer class="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6">
    <div class="max-w-6xl mx-auto">
      <div class="flex flex-col md:flex-row items-center justify-between gap-6">
        <!-- Logo + tagline -->
        <div class="text-center md:text-left">
          <h3 class="text-2xl font-bold text-white font-heading">TUREX</h3>
          <p class="text-sm mt-1">Democratizando el turismo en Mexico</p>
        </div>

        <!-- Links -->
        <div class="flex gap-6 text-sm">
          <a href="#" class="hover:text-white transition-colors">Sobre nosotros</a>
          <a href="#" class="hover:text-white transition-colors">Contacto</a>
          <a href="#" class="hover:text-white transition-colors">Privacidad</a>
        </div>
      </div>

      <div class="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
        <p>Hecho con 🇲🇽 para el mundo &middot; TUREX {{ new Date().getFullYear() }}</p>
      </div>
    </div>
  </footer>
</template>
