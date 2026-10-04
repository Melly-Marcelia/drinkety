<script setup>
import { computed } from 'vue'
import { MILESTONES, computeStats } from '../data/milestones'

const props = defineProps({
  entries: { type: Object, required: true }, // every logged drink, all-time, keyed by date
  name: { type: String, required: true },
})
const emit = defineEmits(['close', 'update:name', 'view-stamps'])

const stats = computed(() => computeStats(props.entries))
const stampsUnlocked = computed(() => MILESTONES.filter((m) => m.goal(stats.value)).length)

const initial = computed(() => props.name.trim().charAt(0).toUpperCase() || '?')

const firstLogged = computed(() => {
  const dates = Object.keys(props.entries).sort()
  if (!dates.length) return null
  return new Date(`${dates[0]}T00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
})

const tiles = computed(() => [
  { label: stats.value.total === 1 ? 'drink logged' : 'drinks logged', value: stats.value.total },
  { label: 'day streak', value: stats.value.longestStreak },
  {
    label: stats.value.countries.size === 1 ? 'country' : 'countries',
    value: stats.value.countries.size,
  },
  { label: 'stamps', value: `${stampsUnlocked.value}/${MILESTONES.length}` },
])
</script>

<template>
  <div
    class="sheet"
    role="dialog"
    aria-modal="true"
    aria-label="Profile"
    @click.self="emit('close')"
  >
    <div class="card-sheet">
      <header class="bar">
        <span class="spacer" aria-hidden="true"></span>
        <h2>Profile</h2>
        <button class="round" type="button" aria-label="Close" @click="emit('close')">
          <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div class="body">
        <div class="hero">
          <span class="avatar">{{ initial }}</span>
          <input
            class="name-input"
            type="text"
            maxlength="24"
            placeholder="Your name"
            :value="name"
            @input="emit('update:name', $event.target.value)"
          />
          <p v-if="firstLogged" class="since">Logging drinks since {{ firstLogged }}</p>
        </div>

        <div class="stat-grid">
          <div v-for="tile in tiles" :key="tile.label" class="stat-tile">
            <span class="stat-value">{{ tile.value }}</span>
            <span class="stat-label">{{ tile.label }}</span>
          </div>
        </div>

        <button class="stamps-link" type="button" @click="emit('view-stamps')">
          <svg viewBox="0 0 24 24" class="icon lead" aria-hidden="true">
            <circle cx="12" cy="9" r="5.3" />
            <circle cx="12" cy="9" r="2" />
            <path d="M8.8 13.2 7 21 12 18.3 17 21 15.2 13.2" />
          </svg>
          <span class="row-text">View your stamps</span>
          <svg viewBox="0 0 24 24" class="icon trail" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
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
  gap: 16px;
  padding: 20px 16px calc(env(safe-area-inset-bottom, 0px) + 28px);
}

.hero {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding-top: 4px;
}

.avatar {
  display: grid;
  width: 76px;
  height: 76px;
  place-items: center;
  border: 1px solid var(--button-border);
  border-radius: 50%;
  background: color-mix(in srgb, var(--pink) 26%, var(--maroon));
  font-size: 30px;
  font-weight: 700;
  color: var(--pink);
}

.name-input {
  width: 100%;
  margin-top: 4px;
  border: 0;
  background: transparent;
  color: var(--cream);
  font: inherit;
  font-size: 22px;
  font-weight: 700;
  text-align: center;
}

.name-input::placeholder {
  color: color-mix(in srgb, var(--cream) 42%, transparent);
}

.since {
  margin: 0;
  font-size: 12.5px;
  color: var(--muted);
}

.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-tile {
  display: grid;
  gap: 2px;
  padding: 16px;
  border: 1px solid var(--button-border);
  border-radius: 20px;
  background: var(--card);
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
}

.stat-label {
  font-size: 12px;
  color: var(--muted);
}

.stamps-link {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 60px;
  padding: 0 20px 0 18px;
  border: 1px solid var(--button-border);
  border-radius: 24px;
  background: var(--card);
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.row-text {
  flex: 1;
  text-align: left;
  font-size: 16px;
  font-weight: 700;
}

.lead {
  color: var(--pink);
}

.trail {
  color: var(--blue);
}
</style>
