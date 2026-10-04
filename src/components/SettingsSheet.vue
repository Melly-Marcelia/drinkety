<script setup>
import { ref, watch } from 'vue'

const emit = defineEmits(['close'])

const reduceMotion = ref(document.documentElement.classList.contains('reduce-motion'))
watch(reduceMotion, (on) => {
  document.documentElement.classList.toggle('reduce-motion', on)
  localStorage.setItem('drinkety-reduce-motion', String(on))
})

// swap in a real Ko-fi / Buy Me a Coffee / PayPal.me link once there is one
const SUPPORT_LINK = ''
function openSupportLink() {
  if (SUPPORT_LINK) window.open(SUPPORT_LINK, '_blank', 'noopener')
}

// swap in a real contact address
const CONTACT_EMAIL = 'hello@drinkety.app'
</script>

<template>
  <div
    class="sheet"
    role="dialog"
    aria-modal="true"
    aria-label="Settings"
    @click.self="emit('close')"
  >
    <div class="card-sheet">
      <header class="bar">
        <span class="spacer" aria-hidden="true"></span>
        <h2>Settings</h2>
        <button class="round" type="button" aria-label="Close" @click="emit('close')">
          <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div class="body">
        <section class="box" aria-label="Appearance">
          <h3 class="box-title">Appearance</h3>
          <div class="row">
            <svg viewBox="0 0 24 24" class="icon lead" aria-hidden="true">
              <path
                d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2.3 1.5 1 2.2 1.8 2.6C10.6 8.3 10.8 5.6 12 3z"
              />
            </svg>
            <span class="row-text">
              Reduce motion
              <span class="row-sub">Turns off stickers falling, wiggling and bouncing in</span>
            </span>
            <button
              type="button"
              class="switch"
              :class="{ 'is-on': reduceMotion }"
              role="switch"
              :aria-checked="reduceMotion"
              aria-label="Reduce motion"
              @click="reduceMotion = !reduceMotion"
            >
              <span class="switch-thumb"></span>
            </button>
          </div>
        </section>

        <section class="box" aria-label="Support">
          <h3 class="box-title">Buy Us a Fun Drink</h3>
          <p class="about-text">
            Drinkety's free and always will be. If you're feeling generous, a little something
            toward our next fun drink always makes our day.
          </p>
          <button type="button" class="support-button" @click="openSupportLink">
            <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
              <rect x="5" y="3" width="14" height="3.6" rx="1.2" />
              <path d="M6.3 6.6 7.6 19.9Q7.7 21 8.8 21h6.4q1.1 0 1.2-1.1l1.3-13.3" />
              <path d="M6.7 11h10.6" />
            </svg>
            Send us a drink
          </button>
        </section>

        <section class="box" aria-label="About">
          <h3 class="box-title">About Us</h3>
          <p class="about-text">
            Every drink's worth remembering. Drinkety keeps the log, tracks your streaks, hands out
            stamps for the milestones, and pins the map with everywhere you've sipped.
          </p>
        </section>

        <section class="box" aria-label="Contact">
          <h3 class="box-title">Contact Us</h3>
          <a class="row row--button" :href="`mailto:${CONTACT_EMAIL}`">
            <svg viewBox="0 0 24 24" class="icon lead" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2.5" />
              <path d="M3.5 6.5 12 13.5l8.5-7" />
            </svg>
            <span class="row-text">{{ CONTACT_EMAIL }}</span>
          </a>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sheet {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgb(0 0 0 / 0.55);
  font-family: 'Courier New', Courier, monospace;
  color: var(--cream);
}

.card-sheet {
  width: 100%;
  max-width: 430px;
  max-height: calc(100% - max(env(safe-area-inset-top), 12px));
  overflow-y: auto;
  border-radius: 28px 28px 0 0;
  background: color-mix(in srgb, var(--pink) 6%, var(--maroon));
  box-shadow: 0 -1px 0 var(--button-border);
}

.icon {
  flex: none;
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.bar {
  display: grid;
  grid-template-columns: 37px 1fr 37px;
  align-items: center;
  padding: 14px 14px 0;
}

.bar h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  text-align: center;
}

.round {
  display: grid;
  place-items: center;
  width: 37px;
  height: 37px;
  padding: 0;
  border: 1px solid var(--button-border);
  border-radius: 50%;
  background: var(--button);
  color: var(--cream);
  cursor: pointer;
}

.spacer {
  width: 37px;
  height: 37px;
}

.body {
  display: grid;
  gap: 14px;
  padding: 18px 16px calc(env(safe-area-inset-bottom, 0px) + 28px);
}

.box {
  padding: 14px;
  border: 1px solid var(--button-border);
  border-radius: 24px;
  background: var(--card);
}

.box-title {
  margin: 2px 4px 10px;
  font-size: 13px;
  font-weight: 700;
  color: var(--blue);
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  width: 100%;
  color: inherit;
  font: inherit;
  text-align: left;
  text-decoration: none;
  background: none;
  border: 0;
  cursor: default;
}

.row--button {
  cursor: pointer;
}

.row-text {
  flex: 1;
  display: grid;
  gap: 2px;
  font-size: 15px;
  font-weight: 700;
}

.row-sub {
  font-size: 11.5px;
  font-weight: 400;
  color: var(--muted);
}

.lead {
  width: 26px;
  height: 26px;
  color: var(--blue);
}

.lead--accent {
  color: var(--pink);
}

.switch {
  position: relative;
  flex: none;
  width: 46px;
  height: 28px;
  padding: 3px;
  border: 1px solid var(--button-border);
  border-radius: 999px;
  background: var(--button);
  cursor: pointer;
}

.switch-thumb {
  display: block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--muted);
  transition:
    translate 0.18s ease,
    background 0.18s ease;
}

.switch.is-on {
  background: color-mix(in srgb, var(--pink) 30%, var(--button));
}

.switch.is-on .switch-thumb {
  translate: 18px 0;
  background: var(--pink);
}

.about-text {
  margin: 0 4px;
  font-size: 13.5px;
  line-height: 20px;
  color: var(--muted);
}

.support-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 52px;
  margin-top: 12px;
  border: 0;
  border-radius: 999px;
  background: var(--pink);
  color: var(--maroon);
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

.support-button .icon {
  width: 22px;
  height: 22px;
  color: var(--maroon);
}
</style>
