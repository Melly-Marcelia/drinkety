<script setup>
defineProps({
  photos: { type: Array, required: true }, // [{ image, name?, date? }], newest last
})
const emit = defineEmits(['close'])

// each polaroid sits at a small random tilt, stable per photo so it doesn't reshuffle on re-render
const tilts = {}
function tiltFor(image) {
  if (!(image in tilts)) tilts[image] = Math.round((Math.random() - 0.5) * 12)
  return tilts[image]
}

function formatDate(date) {
  const [y, m, d] = date.split('-')
  return `${m}/${d}/${y.slice(2)}`
}
</script>

<template>
  <div
    class="sheet"
    role="dialog"
    aria-modal="true"
    aria-label="Photos"
    @click.self="emit('close')"
  >
    <div class="card-sheet">
      <header class="bar">
        <span class="spacer" aria-hidden="true"></span>
        <h2>Photos</h2>
        <button class="round" type="button" aria-label="Close" @click="emit('close')">
          <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div class="body">
        <ul v-if="photos.length" class="polaroid-grid">
          <li
            v-for="photo in photos"
            :key="photo.image"
            class="polaroid"
            :style="{ '--tilt': `${tiltFor(photo.image)}deg` }"
          >
            <img :src="photo.image" alt="" />
            <span v-if="photo.name || photo.date" class="caption">
              <span v-if="photo.name" class="caption-name">{{ photo.name }}</span>
              <span v-if="photo.date" class="caption-date">{{ formatDate(photo.date) }}</span>
            </span>
          </li>
        </ul>
        <p v-else class="empty">
          No photos yet — snap one next time you add a drink and it'll land here.
        </p>
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
  padding: 20px 16px calc(env(safe-area-inset-bottom, 0px) + 28px);
}

.polaroid-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 26px 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.polaroid {
  position: relative;
  padding: 9px 9px 44px;
  background: var(--cream);
  border-radius: 3px;
  box-shadow: 0 8px 16px rgb(0 0 0 / 0.4);
  rotate: var(--tilt, 0deg);
}

.polaroid img {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  background: var(--cell);
}

.caption {
  position: absolute;
  left: 9px;
  right: 9px;
  bottom: 7px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}

.caption-name {
  display: -webkit-box;
  overflow: hidden;
  font-size: 10px;
  font-weight: 700;
  line-height: 12px;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  color: color-mix(in srgb, var(--maroon) 80%, transparent);
}

.caption-date {
  font-size: 9px;
  line-height: 11px;
  color: color-mix(in srgb, var(--maroon) 55%, transparent);
}

.empty {
  margin: 40px 8px 0;
  text-align: center;
  font-size: 13.5px;
  line-height: 20px;
  color: var(--muted);
}
</style>
