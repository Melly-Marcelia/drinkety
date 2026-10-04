<script setup>
import { computed } from 'vue'

const props = defineProps({
  entry: { type: Object, required: true },
  date: { type: String, required: true }, // 'YYYY-MM-DD'
})
const emit = defineEmits(['close', 'toggle-favourite'])

const title = computed(
  () => props.entry.name || (props.entry.flavour ? `${props.entry.flavour} drink` : 'Fun drink'),
)

const when = computed(() => {
  const day = new Date(`${props.date}T00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return props.entry.time ? `${day}, ${props.entry.time}` : day
})
</script>

<template>
  <div
    class="sheet"
    role="dialog"
    aria-modal="true"
    :aria-label="title"
    @click.self="emit('close')"
  >
    <div class="card-sheet">
      <div class="frame" :class="{ 'is-photo': entry.isPhoto }">
        <img :src="entry.image" alt="" />

        <header class="bar">
          <button class="round" type="button" aria-label="Close" @click="emit('close')">
            <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <button
            class="round star"
            :class="{ 'is-on': entry.favourite }"
            type="button"
            :aria-pressed="Boolean(entry.favourite)"
            aria-label="Favourite"
            @click="emit('toggle-favourite')"
          >
            <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
              <path
                d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z"
              />
            </svg>
          </button>
        </header>
      </div>

      <div class="body">
        <h2>{{ title }}</h2>

        <div class="tags">
          <span v-if="entry.flavour" class="tag tag--filled">{{ entry.flavour }}</span>
          <span class="tag">{{ entry.type }}</span>
          <span v-if="entry.favourite" class="tag tag--fav">Favourite</span>
        </div>

        <div class="row">
          <svg viewBox="0 0 24 24" class="icon lead lead--accent" aria-hidden="true">
            <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
            <path d="M4 10h16M9 3.5v4M15 3.5v4" />
          </svg>
          <span>{{ when }}</span>
        </div>

        <div v-if="entry.shop" class="row">
          <svg viewBox="0 0 24 24" class="icon lead" aria-hidden="true">
            <path
              d="M4 9.5 5.5 4h13L20 9.5M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12.5V20h13v-7.5M10 20v-4.5h4V20"
            />
          </svg>
          <span>{{ entry.shop }}</span>
        </div>

        <div v-if="entry.city" class="row">
          <svg viewBox="0 0 24 24" class="icon lead" aria-hidden="true">
            <path d="M4 20.5V11l4.5-2.5v12M8.5 20.5V5l5-2.5v18M13.5 20.5v-8l4.5 2v6M4 20.5h16" />
          </svg>
          <span>{{ entry.city }}</span>
        </div>

        <div v-if="entry.notes" class="row row--notes">
          <svg viewBox="0 0 24 24" class="icon lead" aria-hidden="true">
            <path d="M4 20.5h6M14.5 5l4.5 4.5L9.5 19H5v-4.5z" />
          </svg>
          <span>{{ entry.notes }}</span>
        </div>
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

/* big picture with the buttons on top */
.frame {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 358 / 260;
  margin: 16px 16px 0;
  overflow: hidden;
  border-radius: 24px;
  background: color-mix(in srgb, var(--pink) 24%, var(--maroon));
}

.frame img {
  width: 100%;
  height: 100%;
  padding: 18px;
  object-fit: contain;
  filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.35));
  transform: rotate(-4deg);
}

.frame.is-photo img {
  padding: 0;
  object-fit: cover;
  filter: none;
  transform: none;
}

.bar {
  position: absolute;
  inset: 0 0 auto;
  display: flex;
  justify-content: space-between;
  padding: 14px 14px 0;
}

.round {
  display: grid;
  place-items: center;
  width: 37px;
  height: 37px;
  padding: 0;
  border: 1px solid rgb(255 255 255 / 0.18);
  border-radius: 50%;
  background: rgb(40 8 8 / 0.55);
  color: var(--cream);
  backdrop-filter: blur(8px);
  cursor: pointer;
}

.star.is-on {
  background: var(--pink);
  color: var(--maroon);
}

.star.is-on .icon {
  fill: currentColor;
}

/* details */
.body {
  display: grid;
  gap: 12px;
  padding: 18px 16px calc(env(safe-area-inset-bottom, 0px) + 28px);
}

.body h2 {
  margin: 0 4px;
  font-size: 24px;
  line-height: 30px;
  font-weight: 700;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 4px 4px;
}

.tag {
  padding: 5px 14px;
  border: 1px solid color-mix(in srgb, var(--cream) 30%, transparent);
  border-radius: 999px;
  font-size: 13px;
}

.tag--filled {
  border-color: transparent;
  background: var(--pink);
  color: var(--maroon);
  font-weight: 700;
}

.tag--fav {
  border-color: transparent;
  background: color-mix(in srgb, var(--blue) 22%, transparent);
  color: var(--blue);
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 60px;
  padding: 0 20px 0 18px;
  border: 1px solid var(--button-border);
  border-radius: 24px;
  background: var(--card);
  font-size: 16px;
  font-weight: 700;
}

.row--notes {
  align-items: flex-start;
  padding-top: 18px;
  padding-bottom: 18px;
  font-weight: 400;
  line-height: 22px;
}

.lead {
  width: 26px;
  height: 26px;
  color: var(--blue);
}

.lead--accent {
  color: var(--pink);
}
</style>
