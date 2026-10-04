<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import logo from '../assets/logo.png'

const emit = defineEmits(['done'])

let timer
onMounted(() => {
  timer = setTimeout(() => emit('done'), 1400)
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="splash" @click="emit('done')">
    <img :src="logo" alt="Drinkety" class="logo" />
  </div>
</template>

<style scoped>
.splash {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.9 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E"),
    var(--maroon);
}

.logo {
  width: min(62vw, 280px);
  animation: pop-in 0.6s cubic-bezier(0.3, 1.6, 0.4, 1) both;
}

@keyframes pop-in {
  0% {
    scale: 0.6;
    opacity: 0;
  }
  60% {
    scale: 1.06;
    opacity: 1;
  }
  100% {
    scale: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .logo {
    animation: none;
  }
}
</style>
