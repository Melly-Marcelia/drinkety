<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { DRINK_TYPES, FLAVOURS } from '../data/drinkTypes'
import { makeSticker, warmUpStickerMaker } from '../utils/makeSticker'
import DateTimePicker from './DateTimePicker.vue'

const props = defineProps({
  defaultDateTime: { type: String, required: true }, // 'YYYY-MM-DDTHH:mm'
  minDate: { type: String, required: true }, // 'YYYY-MM-DD'
  maxDate: { type: String, required: true },
  recent: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'save'])

const image = ref(null) // object URL of the captured / picked photo
const sticker = ref(null) // object URL of the die-cut sticker made from it
const stickerState = ref('idle') // 'idle' | 'making' | 'ready' | 'failed'
const useSticker = ref(true) // the sticker can be swapped back for the plain photo
const dateTime = ref(props.defaultDateTime)
const shop = ref('')
const city = ref('')
const name = ref('')
const notes = ref('')
const flavour = ref(FLAVOURS[0])
const type = ref(DRINK_TYPES[0]) // Home-made
const favourite = ref(false)

const frame = ref(null)
const video = ref(null)
const captureInput = ref(null)
const pickerOpen = ref(false)
const facing = ref('environment')
const camera = ref('starting') // 'starting' | 'live' | 'unavailable'
let stream = null
let saved = false
let gone = false
let typeTouched = false
let stickerRun = 0 // a retake makes any sticker still being cut out stale

const canSave = computed(() =>
  Boolean(image.value && dateTime.value && stickerState.value !== 'making'),
)
const showSticker = computed(() => stickerState.value === 'ready' && useSticker.value)

const dateLabel = computed(() =>
  dateTime.value
    ? new Date(dateTime.value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : 'Pick a date',
)

async function startCamera() {
  stopCamera()
  camera.value = 'starting'
  if (!navigator.mediaDevices?.getUserMedia) {
    camera.value = 'unavailable'
    return
  }
  try {
    const media = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facing.value },
        width: { ideal: 1280 },
        height: { ideal: 1280 },
      },
      audio: false,
    })
    if (gone || image.value) {
      media.getTracks().forEach((track) => track.stop())
      return
    }
    stream = media
    video.value.srcObject = media
    await video.value.play()
    camera.value = 'live'
  } catch {
    camera.value = 'unavailable'
  }
}

function stopCamera() {
  stream?.getTracks().forEach((track) => track.stop())
  stream = null
}

function setImage(url, blob) {
  if (image.value) URL.revokeObjectURL(image.value)
  image.value = url
  stopCamera()
  startSticker(blob)
}

function clearSticker() {
  stickerRun++
  if (sticker.value) URL.revokeObjectURL(sticker.value)
  sticker.value = null
  stickerState.value = 'idle'
  useSticker.value = true
}

// cut the drink out of the photo; if that fails the plain photo is saved instead
async function startSticker(blob) {
  clearSticker()
  const run = stickerRun
  stickerState.value = 'making'
  // let the photo and the scan animation show up before the heavy work starts
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  try {
    const result = await makeSticker(blob)
    if (run !== stickerRun || gone) return
    sticker.value = URL.createObjectURL(result)
    stickerState.value = 'ready'
  } catch {
    if (run === stickerRun) stickerState.value = 'failed'
  }
}

function flip() {
  facing.value = facing.value === 'environment' ? 'user' : 'environment'
  startCamera()
}

// live camera: keep exactly what the viewfinder shows (same crop as object-fit: cover)
function capture() {
  const el = video.value
  const aspect = frame.value.clientWidth / frame.value.clientHeight
  let sw = el.videoWidth
  let sh = el.videoHeight
  if (sw / sh > aspect) sw = sh * aspect
  else sh = sw / aspect
  const canvas = document.createElement('canvas')
  canvas.width = Math.min(1080, Math.round(sw))
  canvas.height = Math.round(canvas.width / aspect)
  canvas
    .getContext('2d')
    .drawImage(
      el,
      (el.videoWidth - sw) / 2,
      (el.videoHeight - sh) / 2,
      sw,
      sh,
      0,
      0,
      canvas.width,
      canvas.height,
    )
  canvas.toBlob((blob) => blob && setImage(URL.createObjectURL(blob), blob), 'image/jpeg', 0.9)
}

function onShutter() {
  if (image.value) {
    // retake
    URL.revokeObjectURL(image.value)
    image.value = null
    clearSticker()
    startCamera()
  } else if (camera.value === 'live') {
    capture()
  } else {
    // no live camera (permission denied, desktop…): hand over to the phone's camera app
    captureInput.value.click()
  }
}

function onPick(event) {
  const file = event.target.files?.[0]
  if (file) setImage(URL.createObjectURL(file), file)
  event.target.value = '' // lets the same file be picked again
}

function pickType(option) {
  typeTouched = true
  type.value = option
}

// a shop name means it was bought there, unless the type was chosen by hand
function onShopInput() {
  if (!typeTouched) type.value = shop.value.trim() ? 'Store-bought' : DRINK_TYPES[0]
}

function save() {
  if (!canSave.value) return
  saved = true
  const [date, time] = dateTime.value.split('T')
  emit('save', {
    image: image.value,
    sticker: showSticker.value ? sticker.value : null,
    date,
    time,
    flavour: flavour.value,
    type: type.value,
    name: name.value.trim(),
    shop: shop.value.trim(),
    city: city.value.trim(),
    notes: notes.value.trim(),
    favourite: favourite.value,
  })
}

onMounted(() => {
  startCamera()
  warmUpStickerMaker()
})
onBeforeUnmount(() => {
  gone = true
  stopCamera()
  // a photo or sticker that was never saved is not needed any more
  if (!saved && image.value) URL.revokeObjectURL(image.value)
  if (sticker.value && !(saved && useSticker.value)) URL.revokeObjectURL(sticker.value)
})
</script>

<template>
  <div class="sheet" role="dialog" aria-modal="true" aria-label="Add a drink">
    <div class="card-sheet">
      <div ref="frame" class="viewfinder">
        <video v-show="camera === 'live' && !image" ref="video" autoplay playsinline muted></video>
        <img v-if="image" class="shot" :src="image" alt="Your drink" />

        <!-- the sticker maker: scans the photo, then the cut-out pops up on top of it -->
        <div
          v-if="image && stickerState !== 'idle'"
          class="maker"
          :class="{ 'is-shown': showSticker }"
        >
          <span v-if="stickerState === 'making'" class="scan" aria-hidden="true"></span>
          <img v-if="showSticker" class="made" :src="sticker" alt="Your drink as a sticker" />
          <span v-if="stickerState === 'making'" class="status" role="status">
            Making your sticker…
          </span>
          <span v-else-if="stickerState === 'failed'" class="status" role="status">
            Couldn't cut it out, the photo is used
          </span>
        </div>

        <div v-if="!image && camera !== 'live'" class="guide">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="5" y="3" width="14" height="3.6" rx="1.2" />
            <path d="M6.3 6.6 7.6 19.9Q7.7 21 8.8 21h6.4q1.1 0 1.2-1.1l1.3-13.3" />
            <path d="M6.7 11h10.6M12 3V.6l3-.8" />
          </svg>
          <p v-if="camera === 'unavailable'">
            Camera not available here. Tap the shutter to open your camera, or pick from the
            gallery.
          </p>
        </div>

        <span
          v-if="camera === 'starting' && !image"
          class="spinner"
          aria-label="Starting camera"
        ></span>

        <template v-if="!image">
          <span class="corner corner--tl"></span>
          <span class="corner corner--tr"></span>
          <span class="corner corner--bl"></span>
          <span class="corner corner--br"></span>
          <span v-if="camera !== 'unavailable'" class="hint">Fit the whole cup in the frame</span>
        </template>

        <header class="bar">
          <button class="round" type="button" aria-label="Close" @click="emit('close')">
            <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <h2>Add Drink</h2>
          <button class="round" type="button" aria-label="Save" :disabled="!canSave" @click="save">
            <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </button>
        </header>

        <div class="controls">
          <!-- gallery button; once there is a photo it turns into a little polaroid of it -->
          <label
            class="gallery"
            :class="{ 'is-polaroid': image }"
            :aria-label="image ? 'Choose another photo from the gallery' : 'Choose from gallery'"
          >
            <span v-if="image" class="polaroid"><img :src="image" alt="" /></span>
            <svg v-else viewBox="0 0 24 24" class="icon" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2.5" />
              <circle cx="8.5" cy="9.5" r="1.5" />
              <path d="M3.5 17.5l5-4.5 4 3.5 3-2.5 5 4" />
            </svg>
            <input type="file" accept="image/*" @change="onPick" />
          </label>

          <button
            class="shutter"
            type="button"
            :aria-label="image ? 'Retake photo' : 'Take photo'"
            @click="onShutter"
          >
            <svg v-if="image" viewBox="0 0 24 24" class="icon" aria-hidden="true">
              <path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5" />
            </svg>
          </button>

          <!-- once the sticker is made, the flip slot swaps between sticker and plain photo -->
          <button
            v-if="stickerState === 'ready'"
            class="flip swap"
            type="button"
            :aria-pressed="useSticker"
            :aria-label="useSticker ? 'Use the photo instead' : 'Use the sticker'"
            @click="useSticker = !useSticker"
          >
            {{ useSticker ? 'Photo' : 'Sticker' }}
          </button>
          <button
            v-else
            class="flip"
            type="button"
            aria-label="Flip camera"
            :disabled="camera === 'unavailable' || Boolean(image)"
            @click="flip"
          >
            <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
              <path d="M20 12a8 8 0 0 1-13.7 5.6M4 12A8 8 0 0 1 17.7 6.4M18 3v4h-4M6 21v-4h4" />
            </svg>
          </button>
        </div>

        <input
          ref="captureInput"
          class="hidden-input"
          type="file"
          accept="image/*"
          capture="environment"
          tabindex="-1"
          @change="onPick"
        />
      </div>

      <div class="rows">
        <section class="box" aria-label="What are you drinketying?">
          <h3 class="box-title">What are you drinketying?</h3>
          <div class="chips chips--scroll" role="radiogroup" aria-label="Kind of drink">
            <button
              v-for="option in FLAVOURS"
              :key="option"
              class="chip"
              :class="{ 'is-active': flavour === option }"
              type="button"
              role="radio"
              :aria-checked="flavour === option"
              @click="flavour = option"
            >
              {{ option }}
            </button>
          </div>
        </section>

        <section class="box" aria-label="How is it made?">
          <h3 class="box-title">How is it made?</h3>
          <div class="chips chips--scroll" role="radiogroup" aria-label="How is it made">
            <button
              v-for="option in DRINK_TYPES"
              :key="option"
              class="chip"
              :class="{ 'is-active': type === option }"
              type="button"
              role="radio"
              :aria-checked="type === option"
              @click="pickType(option)"
            >
              {{ option }}
            </button>
          </div>
        </section>

        <button class="row row--button" type="button" @click="pickerOpen = true">
          <svg viewBox="0 0 24 24" class="icon lead lead--accent" aria-hidden="true">
            <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
            <path d="M4 10h16M9 3.5v4M15 3.5v4" />
          </svg>
          <span class="row-text">{{ dateLabel }}</span>
          <svg viewBox="0 0 24 24" class="icon trail" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <label class="row">
          <svg viewBox="0 0 24 24" class="icon lead" aria-hidden="true">
            <path
              d="M4 9.5 5.5 4h13L20 9.5M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12.5V20h13v-7.5M10 20v-4.5h4V20"
            />
          </svg>
          <input
            v-model="shop"
            class="row-input"
            type="text"
            maxlength="40"
            placeholder="Shop Name..."
            @input="onShopInput"
          />
        </label>

        <label class="row">
          <svg viewBox="0 0 24 24" class="icon lead" aria-hidden="true">
            <path d="M4 20.5V11l4.5-2.5v12M8.5 20.5V5l5-2.5v18M13.5 20.5v-8l4.5 2v6M4 20.5h16" />
          </svg>
          <input
            v-model="city"
            class="row-input"
            type="text"
            maxlength="40"
            placeholder="City..."
          />
        </label>

        <div class="row">
          <svg viewBox="0 0 24 24" class="icon lead" aria-hidden="true">
            <rect x="5" y="3" width="14" height="3.6" rx="1.2" />
            <path d="M6.3 6.6 7.6 19.9Q7.7 21 8.8 21h6.4q1.1 0 1.2-1.1l1.3-13.3" />
            <path d="M6.7 11h10.6" />
          </svg>
          <input
            v-model="name"
            class="row-input"
            type="text"
            maxlength="40"
            placeholder="Drink Name..."
          />
          <button
            class="star"
            :class="{ 'is-on': favourite }"
            type="button"
            :aria-pressed="favourite"
            aria-label="Add to monthly favourites"
            @click="favourite = !favourite"
          >
            <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
              <path
                d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z"
              />
            </svg>
          </button>
        </div>

        <section v-if="recent.length" class="box" aria-label="Last used">
          <span class="box-label">Last used:</span>
          <div class="chips">
            <button
              v-for="option in recent"
              :key="option"
              class="chip chip--outline"
              type="button"
              @click="name = option"
            >
              {{ option }}
            </button>
          </div>
        </section>

        <label class="row">
          <svg viewBox="0 0 24 24" class="icon lead" aria-hidden="true">
            <path d="M4 20.5h6M14.5 5l4.5 4.5L9.5 19H5v-4.5z" />
          </svg>
          <input
            v-model="notes"
            class="row-input"
            type="text"
            maxlength="120"
            placeholder="Notes(optional)..."
          />
        </label>
      </div>
    </div>

    <Transition name="fade">
      <DateTimePicker
        v-if="pickerOpen"
        v-model="dateTime"
        :min-date="minDate"
        :max-date="maxDate"
        :today-key="defaultDateTime.slice(0, 10)"
        @close="pickerOpen = false"
      />
    </Transition>
  </div>
</template>

<style scoped>
.sheet {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  justify-content: center;
  padding-top: max(env(safe-area-inset-top), 12px);
  background: rgb(0 0 0 / 0.55);
  font-family: 'Courier New', Courier, monospace;
  color: var(--cream);
}

.card-sheet {
  width: 100%;
  max-width: 430px;
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

/* ---- photo area with the header on top ---- */
.viewfinder {
  position: relative;
  aspect-ratio: 358 / 330;
  margin: 16px 16px 0;
  overflow: hidden;
  border-radius: 24px;
  background: color-mix(in srgb, var(--maroon) 62%, #000);
}

.viewfinder video,
.viewfinder .shot {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* darkens the top so the header stays readable over any photo */
.viewfinder::after {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 45%;
  background: linear-gradient(rgb(0 0 0 / 0.5), transparent);
  pointer-events: none;
}

.bar {
  position: absolute;
  inset: 0 0 auto;
  z-index: 2;
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
  text-shadow: 0 1px 6px rgb(0 0 0 / 0.4);
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

.round:disabled,
.flip:disabled {
  opacity: 0.4;
  cursor: default;
}

.guide {
  position: absolute;
  inset: 66px 0 100px;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 6px;
  padding: 0 46px;
  text-align: center;
  color: color-mix(in srgb, var(--pink) 45%, transparent);
}

.guide svg {
  width: 96px;
  height: 96px;
  fill: none;
  stroke: currentColor;
  stroke-width: 0.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.guide p {
  margin: 0;
  font-size: 11.5px;
  line-height: 15px;
  color: var(--muted);
}

.spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 34px;
  height: 34px;
  margin: -17px 0 0 -17px;
  border: 3px solid color-mix(in srgb, var(--pink) 25%, transparent);
  border-top-color: var(--pink);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.corner {
  position: absolute;
  width: 30px;
  height: 30px;
  border: 0 solid var(--cream);
  opacity: 0.85;
}

.corner--tl {
  top: 64px;
  left: 24px;
  border-width: 3px 0 0 3px;
  border-top-left-radius: 10px;
}

.corner--tr {
  top: 64px;
  right: 24px;
  border-width: 3px 3px 0 0;
  border-top-right-radius: 10px;
}

.corner--bl {
  bottom: 98px;
  left: 24px;
  border-width: 0 0 3px 3px;
  border-bottom-left-radius: 10px;
}

.corner--br {
  right: 24px;
  bottom: 98px;
  border-width: 0 3px 3px 0;
  border-bottom-right-radius: 10px;
}

.hint {
  position: absolute;
  bottom: 106px;
  left: 50%;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgb(0 0 0 / 0.45);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  transform: translateX(-50%);
}

/* ---- sticker maker ---- */
.maker {
  position: absolute;
  inset: 0;
  z-index: 1;
  transition:
    background 0.35s ease,
    backdrop-filter 0.35s ease;
}

.maker.is-shown {
  background: rgb(40 8 8 / 0.55);
  backdrop-filter: blur(6px);
}

/* a soft band of light sweeping over the photo while the drink is cut out */
.scan {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.scan::before {
  content: '';
  position: absolute;
  inset: -30% 0 auto;
  height: 30%;
  background: linear-gradient(
    transparent,
    color-mix(in srgb, var(--pink) 45%, transparent) 70%,
    var(--cream) 96%,
    transparent
  );
  animation: scan 1.3s ease-in-out infinite;
}

@keyframes scan {
  to {
    transform: translateY(440%);
  }
}

.made {
  position: absolute;
  top: 50%;
  left: 50%;
  height: 64%;
  aspect-ratio: 1;
  filter: drop-shadow(0 8px 14px rgb(0 0 0 / 0.4));
  transform: translate(-50%, -46%) rotate(-4deg);
  animation: peel 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.3);
}

@keyframes peel {
  from {
    opacity: 0;
    transform: translate(-50%, -40%) scale(0.6) rotate(-14deg);
  }
}

.status {
  position: absolute;
  bottom: 106px;
  left: 50%;
  padding: 6px 14px;
  border: 0;
  border-radius: 999px;
  background: rgb(0 0 0 / 0.45);
  color: var(--cream);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  transform: translateX(-50%);
}

.swap {
  width: 64px;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
}

/* gallery / shutter / flip, on the bottom edge of the photo */
.controls {
  position: absolute;
  inset: auto 0 14px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.gallery,
.flip {
  position: relative;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: 1px solid rgb(255 255 255 / 0.18);
  border-radius: 16px;
  background: rgb(40 8 8 / 0.55);
  color: var(--pink);
  backdrop-filter: blur(8px);
  cursor: pointer;
}

.gallery.is-polaroid {
  width: 60px;
  height: 60px;
  border: 0;
  background: transparent;
  backdrop-filter: none;
}

.polaroid {
  display: block;
  width: 46px;
  padding: 3px 3px 9px;
  background: var(--cream);
  box-shadow: 0 4px 10px rgb(0 0 0 / 0.4);
  transform: rotate(-8deg);
}

.polaroid img {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

/* the real file inputs stay in the DOM but are invisible */
.gallery input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.hidden-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.shutter {
  display: grid;
  place-items: center;
  width: 68px;
  height: 68px;
  padding: 0;
  border: 3px solid var(--pink);
  border-radius: 50%;
  background: transparent;
  color: var(--maroon);
  cursor: pointer;
}

.shutter::before {
  content: '';
  grid-area: 1 / 1;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--pink);
  transition: transform 0.12s ease;
}

.shutter .icon {
  grid-area: 1 / 1;
  z-index: 1;
  width: 26px;
  height: 26px;
}

.shutter:active::before {
  transform: scale(0.9);
}

/* ---- rows ---- */
.rows {
  display: grid;
  gap: 14px;
  padding: 16px 16px calc(env(safe-area-inset-bottom, 0px) + 32px);
}

.row,
.box {
  border: 1px solid var(--button-border);
  border-radius: 28px;
  background: var(--card);
}

.row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 68px;
  padding: 0 20px 0 18px;
}

.row--button {
  width: 100%;
  padding-top: 0;
  padding-bottom: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.lead {
  width: 26px;
  height: 26px;
  color: var(--blue);
}

.lead--accent {
  color: var(--pink);
}

.trail {
  color: var(--blue);
}

.row-text,
.row-input {
  flex: 1;
  min-width: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--cream);
}

.row-input {
  height: 66px;
  padding: 0;
  border: 0;
  background: transparent;
  outline: none;
}

.row-input::placeholder {
  color: color-mix(in srgb, var(--cream) 42%, transparent);
}

.row:focus-within {
  border-color: color-mix(in srgb, var(--pink) 55%, transparent);
}

.star {
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--blue);
  cursor: pointer;
}

.star .icon {
  width: 28px;
  height: 28px;
}

.star.is-on {
  color: var(--pink);
}

.star.is-on .icon {
  fill: currentColor;
}

.box {
  display: grid;
  gap: 10px;
  padding: 16px 18px 18px;
}

.box-label {
  font-size: 12px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--muted);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* one line that scrolls sideways, running to the edges of the box */
.chips--scroll {
  flex-wrap: nowrap;
  margin: 0 -18px;
  padding: 2px 18px;
  overflow-x: auto;
  scrollbar-width: none;
}

.chips--scroll .chip {
  flex: none;
}

.box-title {
  margin: 0;
  font-size: 18px;
  line-height: 24px;
  font-weight: 700;
  color: var(--cream);
}

.chip {
  height: 38px;
  padding: 0 16px;
  border: 1px solid var(--button-border);
  border-radius: 19px;
  background: var(--cell);
  color: var(--cream);
  font-size: 14px;
  cursor: pointer;
}

.chip--outline {
  height: 42px;
  border: 2px solid color-mix(in srgb, var(--cream) 30%, transparent);
  background: transparent;
  font-size: 15px;
}

.chip.is-active {
  border-color: transparent;
  background: var(--pink);
  color: var(--maroon);
  font-weight: 700;
}
</style>
