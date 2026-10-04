<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { COUNTRY_BY_CODE } from '../data/countries'
import { MILESTONES, STAMP_CATEGORIES, computeStats } from '../data/milestones'

const props = defineProps({
  entries: { type: Object, required: true }, // every logged drink, all-time, keyed by date
  focusSection: { type: String, default: null }, // category id to scroll to + flash on mount
})
const emit = defineEmits(['focused'])

// stamp art: drop `<milestone-id>.png` (e.g. count-10.png, streak-7.png — ids are listed
// in src/data/milestones.js) into src/assets/stamps/
const stampFiles = import.meta.glob('../assets/stamps/*.{png,webp,avif}', {
  eager: true,
  import: 'default',
})
const stampArt = Object.fromEntries(
  Object.entries(stampFiles).map(([path, url]) => [
    path
      .split('/')
      .pop()
      .replace(/\.\w+$/, ''),
    url,
  ]),
)

const stats = computed(() => computeStats(props.entries))

const groups = computed(() =>
  STAMP_CATEGORIES.map((section) => ({
    ...section,
    items: MILESTONES.filter((m) => m.category === section.id).map((m) => ({
      ...m,
      unlocked: m.goal(stats.value),
    })),
  })),
)

const unlockedCount = computed(() => MILESTONES.filter((m) => m.goal(stats.value)).length)

// jumped to from the calendar's streak chip: scroll that section into view and flash it once
const sectionEls = {}
const highlightedSection = ref(null)
onMounted(async () => {
  if (!props.focusSection) return
  await nextTick()
  sectionEls[props.focusSection]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  highlightedSection.value = props.focusSection
  setTimeout(() => {
    highlightedSection.value = null
  }, 1100)
  emit('focused')
})

// one pin per visited country, aggregated across every dated entry that has one
const visitedCountries = computed(() => {
  const byCode = new Map()
  for (const [date, entry] of Object.entries(props.entries)) {
    const info = entry?.country && COUNTRY_BY_CODE[entry.country]
    if (!info) continue
    const bucket = byCode.get(entry.country) ?? { ...info, count: 0, dates: [] }
    bucket.count += 1
    bucket.dates.push(date)
    byCode.set(entry.country, bucket)
  }
  return [...byCode.values()]
})

function popupHtml(country) {
  const dates = country.dates
    .slice()
    .sort()
    .map((d) =>
      new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    )
    .join(', ')
  return `<strong>${country.flag} ${country.name}</strong><br>${country.count} drink${country.count === 1 ? '' : 's'}<br><span class="popup-dates">${dates}</span>`
}

// a chubby teardrop pin with a tiny cup on it, instead of a plain dot — the wrapper div (not
// the icon root Leaflet positions) is what gets the drop-in bounce, so it doesn't fight
// Leaflet's own translate3d positioning
function pinIcon(count) {
  const h = Math.min(38 + (count - 1) * 3, 54)
  const w = h * 0.8
  return L.divIcon({
    className: 'cute-pin',
    html: `<div class="cute-pin-bounce"><svg viewBox="0 0 32 40" width="${w}" height="${h}">
        <path
          d="M16 1C8.8 1 3 6.7 3 13.8c0 9.6 13 24.2 13 24.2s13-14.6 13-24.2C29 6.7 23.2 1 16 1Z"
          fill="#7a1930"
          stroke="#fff4e0"
          stroke-width="1.6"
        />
        <circle cx="16" cy="14" r="8.4" fill="#fff4e0" />
        <g
          transform="translate(16 14) scale(0.6) translate(-12 -12)"
          fill="none"
          stroke="#4c0505"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M13.4 5.7 15.4 1.8" />
          <path d="M6.4 8.5Q6.4 5.7 12 5.7T17.6 8.5Z" />
          <path d="M6.4 8.5 7.7 19.8Q7.85 21 9 21h6q1.15 0 1.3-1.2l1.3-11.3" />
          <path d="M7.1 13.5Q9.5 12.6 12 13.5T16.9 13.5" />
          <g fill="#4c0505" stroke="none">
            <circle cx="9.8" cy="18.4" r="1" />
            <circle cx="12" cy="18.8" r="1" />
            <circle cx="14.2" cy="18.4" r="1" />
            <circle cx="10.9" cy="16.4" r="1" />
            <circle cx="13.1" cy="16.4" r="1" />
          </g>
        </g>
      </svg></div>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h + 6],
  })
}

const mapEl = ref(null)
let map = null
let markers = null

function renderMarkers() {
  if (!map) return
  markers?.remove()
  markers = L.layerGroup(
    visitedCountries.value.map((country) =>
      L.marker([country.lat, country.lng], { icon: pinIcon(country.count) }).bindPopup(
        popupHtml(country),
      ),
    ),
  ).addTo(map)
}

// plain min/max longitude bounds go the "long way round" when visited countries straddle the
// antimeridian (e.g. Japan + Canada would bound through Europe instead of the Pacific). This
// finds the widest empty longitude gap and treats it as the back of the world, so the box
// wraps the short way instead.
function fitToCountries(countries, maxZoom = 4) {
  if (!countries.length) return
  const lats = countries.map((c) => c.lat)
  const lngs = countries
    .map((c) => ((((c.lng + 180) % 360) + 360) % 360) - 180)
    .sort((a, b) => a - b)

  let widestGap = -1
  let splitAt = 0
  lngs.forEach((lng, i) => {
    const next = lngs[(i + 1) % lngs.length]
    const gap = i === lngs.length - 1 ? next + 360 - lng : next - lng
    if (gap > widestGap) {
      widestGap = gap
      splitAt = (i + 1) % lngs.length
    }
  })

  const west = lngs[splitAt]
  let east = lngs[(splitAt + lngs.length - 1) % lngs.length]
  if (east < west) east += 360

  map.fitBounds(
    [
      [Math.min(...lats), west],
      [Math.max(...lats), east],
    ],
    { padding: [30, 30], maxZoom },
  )
}

const isFullscreen = ref(false)
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}
function onKeydown(event) {
  if (event.key === 'Escape' && isFullscreen.value) isFullscreen.value = false
}

const EXPAND_ICON =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7V2h5M17 2h5v5M2 17v5h5M22 17v5h-5"/></svg>'
const COLLAPSE_ICON =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>'

// a plain Vue-rendered sibling of the map can silently fail to paint here: Leaflet promotes its
// tile/marker panes onto GPU layers for panning, and browsers can squash an adjacent, differently
// -composited sibling into that during a pan/zoom (this map fit-animates on load, every time). A
// real Leaflet control lives inside .leaflet-control-container instead, the same layer the zoom
// buttons use, which is unaffected by that
let fullscreenControl = null
function addFullscreenControl() {
  const Control = L.Control.extend({
    options: { position: 'topright' },
    onAdd() {
      const button = L.DomUtil.create('button', 'cute-fullscreen-btn')
      button.type = 'button'
      button.setAttribute('aria-label', 'View map full screen')
      button.innerHTML = EXPAND_ICON
      L.DomEvent.disableClickPropagation(button)
      L.DomEvent.on(button, 'click', toggleFullscreen)
      this._button = button
      return button
    },
  })
  fullscreenControl = new Control()
  fullscreenControl.addTo(map)
}

onMounted(() => {
  map = L.map(mapEl.value, {
    worldCopyJump: true,
    minZoom: 1.4,
    maxZoom: 8,
  }).setView([20, 10], 1.6)

  // plain OSM tiles, no API key needed; .leaflet-tile-pane below inverts them to fit the dark theme
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: 'abc',
    maxZoom: 19,
  }).addTo(map)

  addFullscreenControl()
  renderMarkers()
  fitToCountries(visitedCountries.value)
  requestAnimationFrame(() => map.invalidateSize())
})

// entries can change under us: the + button (outside this tab) stays reachable while it's open
watch(visitedCountries, renderMarkers)

// going fullscreen both resizes AND repositions the container in one step (in-flow -> fixed),
// which invalidateSize()'s default auto-pan can't reconcile. Re-fitting bounds afterwards (rather
// than preserving the old zoom) also fixes a second issue: the tiny embedded map's fit-zoom is
// often too far out to have any tile detail left to fill a much taller fullscreen viewport with —
// the double rAF waits for the CSS class change to actually land before measuring anything
watch(isFullscreen, (on) => {
  if (fullscreenControl?._button) {
    fullscreenControl._button.innerHTML = on ? COLLAPSE_ICON : EXPAND_ICON
    fullscreenControl._button.setAttribute(
      'aria-label',
      on ? 'Exit full screen' : 'View map full screen',
    )
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!map) return
      map.invalidateSize(false)
      fitToCountries(visitedCountries.value, on ? 6 : 4)
    })
  })
})

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  map?.remove()
  map = null
})
</script>

<template>
  <div class="stamps">
    <h1 class="title">Stamps</h1>
    <p class="subtitle">{{ unlockedCount }} / {{ MILESTONES.length }} collected</p>

    <section
      v-for="group in groups"
      :key="group.id"
      :ref="(el) => (sectionEls[group.id] = el)"
      class="section"
      :class="{ 'is-focused': highlightedSection === group.id }"
      :aria-label="group.title"
    >
      <h2>{{ group.title }}</h2>
      <ul class="stamp-grid" :class="{ 'stamp-grid--compact': group.compact }">
        <li
          v-for="(item, i) in group.items"
          :key="item.id"
          class="stamp"
          :class="{ 'is-locked': !item.unlocked }"
          :style="{ '--i': i }"
        >
          <span class="badge">
            <img v-if="stampArt[item.id]" :src="stampArt[item.id]" :alt="item.title" />
            <span v-else class="badge-emoji" aria-hidden="true">{{ item.emoji }}</span>
          </span>
          <span class="stamp-title">{{ item.title }}</span>
        </li>
      </ul>
    </section>

    <section class="section map-section" aria-label="Where you've had a drink">
      <h2>Passport Map</h2>
      <div class="map" :class="{ 'is-fullscreen': isFullscreen }">
        <div ref="mapEl" class="map-canvas"></div>
      </div>
      <p v-if="!visitedCountries.length" class="map-empty">
        Add a country to a drink to start pinning the map.
      </p>
    </section>
  </div>
</template>

<style scoped>
.stamps {
  padding-top: 4px;
}

.title {
  margin: 7px 0 0;
  font-size: 33px;
  line-height: 36px;
  font-weight: 700;
  text-align: center;
  color: var(--cream);
}

.subtitle {
  margin: 4px 0 0;
  font-size: 13.5px;
  text-align: center;
  color: var(--muted);
}

.section {
  margin-top: 21px;
  padding: 16px 16px 18px;
  border-radius: 24px;
  background: var(--card);
  box-shadow: 0 0 0 0 transparent;
}

.section.is-focused {
  animation: section-flash 1.1s ease;
}

@keyframes section-flash {
  0%,
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
  25% {
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--pink) 55%, transparent);
  }
}

.section h2 {
  margin: 0 0 4px 4px;
  font-size: 14px;
  line-height: 18px;
  font-weight: 700;
  color: var(--blue);
}

.stamp-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px 14px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.stamp {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  animation: rise-in 0.5s calc(var(--i, 0) * 0.05s) cubic-bezier(0.3, 1.6, 0.4, 1) both;
}

.badge {
  display: grid;
  width: 68%;
  max-width: 128px;
  aspect-ratio: 3 / 4;
  place-items: center;
}

.badge:has(.badge-emoji) {
  border: 1px dashed var(--button-border);
  border-radius: 16px;
  background: var(--cell);
}

.badge img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgb(0 0 0 / 0.35));
}

.badge-emoji {
  font-size: 40px;
  line-height: 1;
}

.stamp.is-locked .badge {
  filter: grayscale(1) brightness(0.55);
  opacity: 0.55;
}

.stamp-title {
  max-width: 100%;
  font-size: 12px;
  line-height: 15px;
  text-align: center;
  color: var(--cream);
}

.stamp.is-locked .stamp-title {
  color: var(--muted);
}

/* Streaks keeps the original small round badges instead of full-size stamp art */
.stamp-grid--compact {
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 14px 6px;
}

.stamp-grid--compact .stamp {
  gap: 6px;
}

.stamp-grid--compact .badge {
  width: 58px;
  height: 58px;
  aspect-ratio: auto;
  border: 1px solid var(--button-border);
  border-radius: 50%;
  background: var(--cell);
}

.stamp-grid--compact .badge img {
  width: 68%;
  height: 68%;
  filter: none;
}

.stamp-grid--compact .badge-emoji {
  font-size: 26px;
}

.stamp-grid--compact .stamp-title {
  max-width: 74px;
  overflow: hidden;
  font-size: 10.5px;
  line-height: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes rise-in {
  0% {
    scale: 0.3;
    opacity: 0;
  }
  55% {
    scale: 1.08;
    opacity: 1;
  }
  100% {
    scale: 1;
  }
}

.map-section {
  padding: 16px 16px 18px;
}

.map {
  position: relative;
  height: 300px;
  margin-top: 10px;
  border-radius: 18px;
  overflow: hidden;
  background: var(--cell);
}

.map-canvas {
  width: 100%;
  height: 100%;
}

.map.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 20;
  height: 100dvh;
  margin: 0;
  border-radius: 0;
}

.map-empty {
  margin: 10px 4px 0;
  font-size: 12.5px;
  color: var(--muted);
}

.map :deep(.leaflet-container) {
  background: var(--maroon);
  font-family: 'Courier New', Courier, monospace;
}

/* OSM tiles come light; invert just the tile layer so the map reads dark like the rest of the app */
.map :deep(.leaflet-tile-pane) {
  filter: invert(1) hue-rotate(175deg) brightness(0.95) contrast(0.9) saturate(0.6);
}

.map :deep(.cute-pin) {
  background: transparent;
  border: none;
}

/* the bounce lives on this inner wrapper, not the icon root Leaflet itself positions with translate3d */
.map :deep(.cute-pin-bounce) {
  transform-origin: 50% 100%;
  filter: drop-shadow(0 3px 3px rgb(0 0 0 / 0.45));
  animation: pin-drop 0.5s cubic-bezier(0.3, 1.6, 0.4, 1) both;
}

@keyframes pin-drop {
  0% {
    translate: 0 -16px;
    scale: 0.4;
    opacity: 0;
  }
  60% {
    translate: 0 2px;
    scale: 1.08;
    opacity: 1;
  }
  100% {
    translate: 0 0;
    scale: 1;
  }
}

.map :deep(.leaflet-control-zoom) {
  overflow: hidden;
  border: 1px solid var(--button-border) !important;
  border-radius: 12px !important;
}

.map :deep(.leaflet-control-zoom a) {
  background: var(--button) !important;
  color: var(--cream) !important;
}

.map :deep(.leaflet-control-attribution) {
  background: color-mix(in srgb, var(--maroon) 70%, transparent) !important;
  color: var(--muted) !important;
}

.map :deep(.leaflet-control-attribution a) {
  color: var(--blue) !important;
}

.map :deep(.cute-fullscreen-btn) {
  display: grid;
  width: 37px;
  height: 37px;
  place-items: center;
  border: 1px solid var(--button-border);
  border-radius: 50%;
  background: var(--button);
  color: var(--cream);
  cursor: pointer;
}

/* keeps both corner controls clear of the notch/status bar once the map goes fixed+full-height */
.map.is-fullscreen :deep(.leaflet-top) {
  top: max(env(safe-area-inset-top), 10px);
}

.map :deep(.leaflet-popup-content-wrapper) {
  border-radius: 16px;
  background: var(--card);
  color: var(--cream);
}

.map :deep(.leaflet-popup-tip) {
  background: var(--card);
}

.map :deep(.popup-dates) {
  font-size: 11px;
  color: var(--muted);
}

@media (prefers-reduced-motion: reduce) {
  .stamp {
    animation: none;
  }

  .map :deep(.cute-pin-bounce) {
    animation: none;
  }

  .section.is-focused {
    animation: none;
  }
}
</style>
