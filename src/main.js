import './assets/main.css'

import { createApp } from 'vue'

import App from './App.vue'

// applied before mount so there's no flash of animation on load when the user has this set
document.documentElement.classList.toggle(
  'reduce-motion',
  localStorage.getItem('drinkety-reduce-motion') === 'true',
)

createApp(App).mount('#app')
