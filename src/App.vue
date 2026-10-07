<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import AddDrinkSheet from './components/AddDrinkSheet.vue'
import DrinkDetailSheet from './components/DrinkDetailSheet.vue'
import PolaroidSheet from './components/PolaroidSheet.vue'
import ProfileSheet from './components/ProfileSheet.vue'
import SettingsSheet from './components/SettingsSheet.vue'
import SplashScreen from './components/SplashScreen.vue'
import StampsPage from './components/StampsPage.vue'
import { drinkDetails } from './data/drinkDetails'
import { DRINK_TYPES, RECENT_DRINKS, drinkTypes } from './data/drinkTypes'
import { favourites } from './data/favourites'
import { photoDetails } from './data/photoDetails'

// Drink stickers: drop `YYYY-MM-DD.png` (transparent, die-cut sticker) into src/assets/drinks/
const drinkFiles = import.meta.glob('./assets/drinks/*.{png,webp,avif}', {
  eager: true,
  import: 'default',
})

// Polaroids for the photo folder: any image in src/assets/photos/ (last two, sorted by name)
const photoFiles = import.meta.glob('./assets/photos/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
  import: 'default',
})

const drinksByDate = Object.fromEntries(
  Object.entries(drinkFiles)
    .map(([path, url]) => [
      path
        .split('/')
        .pop()
        .replace(/\.\w+$/, ''),
      url,
    ])
    .filter(([key]) => /^\d{4}-\d{2}-\d{2}$/.test(key)),
)

// photos taken / picked with the + button also end up in the folder widget
const stockPhotos = Object.entries(photoFiles)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, url]) => {
    const key = path
      .split('/')
      .pop()
      .replace(/\.\w+$/, '')
    return { image: url, ...photoDetails[key] }
  })
const addedPhotos = ref([])
const photos = computed(() => [...stockPhotos, ...addedPhotos.value])
const frontPhoto = computed(() => photos.value.at(-1)?.image ?? null)
const backPhoto = computed(() => photos.value.at(-2)?.image ?? null)

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// static demo data: the page is pinned to the screenshot's date instead of following the clock
const today = new Date(2026, 8, 20)
const year = today.getFullYear()
const month = today.getMonth()
const pad = (n) => String(n).padStart(2, '0')
const dateKey = (day) => `${year}-${pad(month + 1)}-${pad(day)}`

const todayLabel = today.toLocaleDateString('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})
const monthLabel = today.toLocaleDateString('en-US', { month: 'short' })
const monthName = today.toLocaleDateString('en-US', { month: 'long' })

// each sticker falls in from the top on load, with a random delay and starting tilt
const rand = (min, max) => min + Math.random() * (max - min)
const fallStyle = (delay) => ({
  '--delay': `${delay.toFixed(2)}s`,
  '--tilt': `${Math.round(rand(-40, 40))}deg`,
  '--rest': `${Math.round(rand(-7, 7))}deg`, // stickers sit slightly crooked, like real ones
})
const fallStyles = {}
const fallFor = (key) => (fallStyles[key] ??= fallStyle(rand(0.05, 1.1)))

// one entry per date: the seeded stickers plus whatever gets added with the + button
const entries = reactive(
  Object.fromEntries(
    Object.entries(drinksByDate).map(([key, image]) => [
      key,
      {
        image,
        type: drinkTypes[key] ?? 'Others',
        favourite: favourites.includes(key),
        isPhoto: false,
        ...drinkDetails[key],
      },
    ]),
  ),
)

const TINTS = ['var(--pink)', 'var(--blue)', 'var(--cream)'] // candy colours behind the stickers

const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7 // weeks start on Monday
const daysInMonth = new Date(year, month + 1, 0).getDate()

const cells = computed(() => [
  ...Array.from({ length: leadingBlanks }, (_, i) => ({ key: `blank-${i}`, day: null })),
  ...Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    const key = dateKey(day)
    const entry = entries[key] ?? null
    return {
      key,
      day,
      entry,
      fall: entry ? fallFor(key) : null,
      tint: TINTS[day % TINTS.length],
      isToday: day === today.getDate(),
      isWeekend: (leadingBlanks + i) % 7 >= 5,
    }
  }),
])

const monthEntries = computed(() => cells.value.filter((cell) => cell.entry))

// longest run of days in a row with a drink
const bestStreak = computed(() => {
  let best = 0
  let run = 0
  let prev = -2
  for (const { day } of monthEntries.value) {
    run = day === prev + 1 ? run + 1 : 1
    prev = day
    best = Math.max(best, run)
  }
  return best
})

// monthly / weekly: what the calendar, the summary card and the favourites card show
const view = ref('month') // 'month' | 'week'
const trailingBlanks = (7 - ((leadingBlanks + daysInMonth) % 7)) % 7
const weeks = computed(() => {
  const padded = [
    ...cells.value,
    ...Array.from({ length: trailingBlanks }, (_, i) => ({ key: `blank-end-${i}`, day: null })),
  ]
  return Array.from({ length: padded.length / 7 }, (_, i) => padded.slice(i * 7, i * 7 + 7))
})
const weekIndex = ref(Math.floor((leadingBlanks + today.getDate() - 1) / 7))
const visibleCells = computed(() =>
  view.value === 'week' ? weeks.value[weekIndex.value] : cells.value,
)
const weekTitle = computed(() => {
  const days = weeks.value[weekIndex.value]
    .filter((cell) => cell.day !== null)
    .map((cell) => cell.day)
  return `${monthLabel} ${days[0]} – ${days.at(-1)}`
})
const scopeEntries = computed(() => visibleCells.value.filter((cell) => cell.entry))

const brewCount = computed(() => scopeEntries.value.length)
const typeCounts = computed(() =>
  DRINK_TYPES.map((type) => ({
    type,
    count: scopeEntries.value.filter((cell) => cell.entry.type === type).length,
  })),
)
const favouritesInView = computed(() =>
  scopeEntries.value
    .filter((cell) => cell.entry.favourite)
    .map((cell) => ({
      key: cell.key,
      entry: cell.entry,
      label: cell.entry.name || `${monthLabel} ${cell.day}`,
    })),
)

// the card shows the drink that was added last, or else the latest one in view
const lastAddedKey = ref(null)
const latestEntry = computed(
  () =>
    scopeEntries.value.find((cell) => cell.key === lastAddedKey.value)?.entry ??
    scopeEntries.value.at(-1)?.entry ??
    null,
)
const latestFall = ref(fallStyle(1.3)) // pops in last, after the calendar has landed

// cups wiggle: on hover with a mouse (CSS); on touch screens a few random ones do it by themselves
const wiggling = ref(new Set())
let wiggleTimer
function wiggleSomeCups() {
  const keys = scopeEntries.value.map((cell) => cell.key)
  const picked = new Set()
  const howMany = Math.min(keys.length, 1 + Math.floor(Math.random() * 2))
  while (picked.size < howMany) picked.add(keys[Math.floor(Math.random() * keys.length)])
  wiggling.value = picked
  setTimeout(() => (wiggling.value = new Set()), 1400)
  wiggleTimer = setTimeout(wiggleSomeCups, rand(1500, 3200))
}
onMounted(() => {
  const touchOnly = matchMedia('(hover: none)').matches
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (touchOnly && !calm) wiggleTimer = setTimeout(wiggleSomeCups, 2600)
})
onBeforeUnmount(() => clearTimeout(wiggleTimer))

const sheetOpen = ref(false)
const sheetDate = ref(dateKey(today.getDate())) // day the add screen opens on

function openSheet(key = dateKey(today.getDate())) {
  sheetDate.value = key
  sheetOpen.value = true
}

// sparkles: a little burst of confetti dots on a day cell
const burst = ref(null)
const sparkColours = ['var(--pink)', 'var(--blue)', 'var(--cream)']
function sparkle(key) {
  const id = Date.now()
  burst.value = { key, id }
  setTimeout(() => {
    if (burst.value?.id === id) burst.value = null
  }, 800)
}

// the drink whose details are open (the key stays while the sheet slides away)
const detailOpen = ref(false)
const detailKey = ref(null)

function toggleFavourite() {
  const entry = entries[detailKey.value]
  entry.favourite = !entry.favourite
}

// tap a sticker: it pops and sparkles, then its details open; tap an empty day: add a drink for that day
function onDay(cell, event) {
  if (!cell.entry) {
    openSheet(cell.key)
    return
  }
  const el = event.currentTarget
  el.classList.remove('is-pop')
  void el.offsetWidth // restart the animation if it is tapped again
  el.classList.add('is-pop')
  sparkle(cell.key)
  navigator.vibrate?.(12)
  detailKey.value = cell.key
  setTimeout(() => (detailOpen.value = true), 380) // let the pop play first
}
const recentNames = ref([...RECENT_DRINKS]) // shown as quick-fill chips on the add screen
const nowTime = () => `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`

function addDrink({
  image,
  sticker,
  date,
  time,
  flavour,
  type,
  name,
  shop,
  city,
  country,
  notes,
  favourite,
}) {
  fallStyles[date] = fallStyle(0.4) // wait for the sheet to slide away first
  // the die-cut sticker goes on the calendar; without one the photo is shown instead
  entries[date] = {
    image: sticker || image,
    photo: image,
    time,
    flavour,
    type,
    name,
    shop,
    city,
    country,
    notes,
    favourite,
    isPhoto: !sticker,
  }
  addedPhotos.value.push({ image, name, date })
  if (name) recentNames.value = [name, ...recentNames.value.filter((n) => n !== name)].slice(0, 5)
  lastAddedKey.value = date
  latestFall.value = fallStyle(0.8)
  sheetOpen.value = false
  setTimeout(() => sparkle(date), 1150) // once the sticker has landed
}

const activeTab = ref('brews')
const showSplash = ref(true)

// tapping the streak chip jumps to the Stamps page's Streaks section
const stampsFocus = ref(null)
function goToStreaks() {
  activeTab.value = 'stamps'
  stampsFocus.value = 'streaks'
}

const profileOpen = ref(false)
const settingsOpen = ref(false)
const photosOpen = ref(false)

const profileName = ref(localStorage.getItem('drinkety-name') || 'You')
watch(profileName, (name) => localStorage.setItem('drinkety-name', name))

function goToStamps() {
  activeTab.value = 'stamps'
  profileOpen.value = false
}
</script>

<template>
  <div class="app">
    <header class="top-row">
      <button class="round-button" type="button" aria-label="Settings" @click="settingsOpen = true">
        <svg viewBox="0 0 24 24" class="icon gear" aria-hidden="true">
          <path
            d="M18.90 9.62 L21.42 10.17 L21.42 13.83 L18.90 14.38 L17.51 16.79 L18.30 19.25 L15.13 21.08 L13.39 19.17 L10.61 19.17 L8.87 21.08 L5.70 19.25 L6.49 16.79 L5.10 14.38 L2.58 13.83 L2.58 10.17 L5.10 9.62 L6.49 7.21 L5.70 4.75 L8.87 2.92 L10.61 4.83 L13.39 4.83 L15.13 2.92 L18.30 4.75 L17.51 7.21 Z"
          />
          <circle cx="12" cy="12" r="2.7" />
        </svg>
      </button>

      <button class="round-button" type="button" aria-label="Profile" @click="profileOpen = true">
        <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
          <circle cx="12" cy="8.3" r="3.6" />
          <path d="M4.8 20.2c1.1-4 3.7-6 7.2-6s6.1 2 7.2 6" />
        </svg>
      </button>
    </header>

    <main>
      <template v-if="activeTab === 'brews'">
        <h1 class="title">Today</h1>
        <p class="date">{{ todayLabel }}</p>

        <div class="view-toggle" role="tablist" aria-label="Calendar view">
          <button
            v-for="option in [
              { id: 'month', label: 'Monthly' },
              { id: 'week', label: 'Weekly' },
            ]"
            :key="option.id"
            type="button"
            role="tab"
            :class="{ 'is-active': view === option.id }"
            :aria-selected="view === option.id"
            @click="view = option.id"
          >
            {{ option.label }}
          </button>
        </div>

        <section
          :key="`${view}-${weekIndex}`"
          class="card calendar"
          :class="{ 'calendar--week': view === 'week' }"
          aria-label="Calendar"
        >
          <div class="cal-head">
            <h2 class="cal-title">
              <svg viewBox="0 0 24 24" class="spark-icon" aria-hidden="true">
                <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" />
              </svg>
              {{ view === 'week' ? weekTitle : monthName }}
            </h2>
            <div v-if="view === 'week'" class="week-nav">
              <button
                type="button"
                aria-label="Previous week"
                :disabled="weekIndex === 0"
                @click="weekIndex--"
              >
                <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Next week"
                :disabled="weekIndex === weeks.length - 1"
                @click="weekIndex++"
              >
                <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </div>
            <button
              v-else-if="bestStreak > 1"
              type="button"
              class="cal-chip"
              aria-label="View streak milestones"
              @click="goToStreaks"
            >
              <svg viewBox="0 0 24 24" class="chip-icon" aria-hidden="true">
                <path
                  d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2.3 1.5 1 2.2 1.8 2.6C10.6 8.3 10.8 5.6 12 3z"
                />
              </svg>
              {{ bestStreak }}-day streak
            </button>
          </div>

          <span v-for="name in weekdays" :key="name" class="weekday">{{ name }}</span>

          <template v-for="cell in visibleCells" :key="cell.key">
            <span v-if="cell.day === null" class="day-blank"></span>
            <button
              v-else
              class="day"
              :class="{
                'is-today': cell.isToday,
                'has-drink': cell.entry,
                'is-weekend': cell.isWeekend,
              }"
              :style="{ '--tint': cell.tint }"
              type="button"
              :aria-label="
                cell.entry
                  ? `Drink on ${monthLabel} ${cell.day}`
                  : `Add a drink on ${monthLabel} ${cell.day}`
              "
              @click="onDay(cell, $event)"
              @animationend.self="$event.currentTarget.classList.remove('is-pop')"
            >
              <span
                v-if="cell.entry"
                class="sticker"
                :class="{ 'is-wiggle': wiggling.has(cell.key) }"
              >
                <img
                  :key="cell.entry.image"
                  :src="cell.entry.image"
                  :class="{ 'is-photo': cell.entry.isPhoto }"
                  alt=""
                  :style="cell.fall"
                />
              </span>
              <span v-if="!cell.entry || view === 'week'" class="num">{{ cell.day }}</span>
              <span v-if="burst?.key === cell.key" :key="burst.id" class="burst" aria-hidden="true">
                <i
                  v-for="n in 10"
                  :key="n"
                  :style="{ '--a': `${n * 36}deg`, '--c': sparkColours[n % 3] }"
                ></i>
              </span>
            </button>
          </template>
        </section>

        <div class="widgets">
          <section class="card summary" :aria-label="view === 'week' ? 'This week' : 'This month'">
            <h2>{{ view === 'week' ? 'This Week' : 'This Month' }}</h2>
            <p class="stat stat--big">
              <span class="stat-value">{{ brewCount }}</span>
              <span class="stat-label">{{ brewCount === 1 ? 'fun drink' : 'fun drinks' }}</span>
            </p>
            <ul class="breakdown">
              <li v-for="{ type, count } in typeCounts" :key="type">
                <span class="count">{{ count }}</span>
                <span>{{ type }}</span>
              </li>
            </ul>
            <img
              v-if="latestEntry"
              :key="latestEntry.image"
              class="summary-drink"
              :class="{ 'is-photo': latestEntry.isPhoto }"
              :src="latestEntry.image"
              :style="latestFall"
              alt=""
            />
          </section>

          <button
            class="folder-widget"
            type="button"
            aria-label="Photos"
            @click="photosOpen = true"
          >
            <svg viewBox="0 0 735 750" aria-hidden="true">
              <defs>
                <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0"
                    style="stop-color: color-mix(in srgb, var(--pink) 42%, var(--maroon))"
                  />
                  <stop
                    offset="1"
                    style="stop-color: color-mix(in srgb, var(--pink) 58%, var(--maroon))"
                  />
                </linearGradient>
                <linearGradient id="night" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" style="stop-color: var(--blue)" />
                  <stop offset="1" style="stop-color: var(--pink)" />
                </linearGradient>
                <filter id="lift" x="-10%" y="-10%" width="120%" height="130%">
                  <feDropShadow
                    dx="0"
                    dy="6"
                    stdDeviation="7"
                    flood-color="#000"
                    flood-opacity="0.3"
                  />
                </filter>
                <clipPath id="clip-back"><rect x="38" y="34" width="378" height="430" /></clipPath>
                <clipPath id="clip-front"><rect x="28" y="42" width="384" height="440" /></clipPath>
              </defs>

              <!-- back of the folder -->
              <path
                style="fill: var(--card)"
                d="M0 270 Q0 220 50 220 L300 220 Q330 220 335 250 Q340 295 385 295 L685 295 Q735 295 735 345 L735 680 Q735 750 665 750 L70 750 Q0 750 0 680 Z"
              />

              <!-- polaroids -->
              <g transform="translate(40 70) rotate(-8)" filter="url(#lift)">
                <rect width="454" height="480" rx="6" style="fill: var(--cream)" />
                <rect x="38" y="34" width="378" height="430" style="fill: var(--pink)" />
                <image
                  v-if="backPhoto"
                  :href="backPhoto"
                  x="38"
                  y="34"
                  width="378"
                  height="430"
                  preserveAspectRatio="xMidYMid slice"
                  clip-path="url(#clip-back)"
                />
              </g>
              <g transform="translate(253 5) rotate(7.4)" filter="url(#lift)">
                <rect width="448" height="500" rx="6" style="fill: var(--cream)" />
                <rect x="28" y="42" width="384" height="440" fill="url(#night)" />
                <image
                  v-if="frontPhoto"
                  :href="frontPhoto"
                  x="28"
                  y="42"
                  width="384"
                  height="440"
                  preserveAspectRatio="xMidYMid slice"
                  clip-path="url(#clip-front)"
                />
              </g>

              <!-- frosted front of the folder -->
              <path
                fill="url(#glass)"
                style="stroke: color-mix(in srgb, var(--cream) 30%, transparent)"
                stroke-width="3"
                d="M38 340 Q38 280 98 280 L250 280 C320 280 320 358 395 358 L640 358 Q698 358 698 418 L698 655 Q698 717 636 717 L100 717 Q38 717 38 655 Z"
              />
            </svg>
          </button>
        </div>

        <section
          v-if="favouritesInView.length"
          class="card favourites"
          :aria-label="view === 'week' ? 'Weekly favourites' : 'Monthly favourites'"
        >
          <h2>{{ view === 'week' ? 'Weekly' : 'Monthly' }} Favourites</h2>
          <ul>
            <li v-for="fav in favouritesInView" :key="fav.key">
              <img :src="fav.entry.image" :class="{ 'is-photo': fav.entry.isPhoto }" alt="" />
              <span>{{ fav.label }}</span>
            </li>
          </ul>
        </section>
      </template>

      <StampsPage
        v-else
        :entries="entries"
        :focus-section="stampsFocus"
        @focused="stampsFocus = null"
      />
    </main>

    <nav class="bottom-nav" aria-label="Primary">
      <div class="segmented" role="tablist">
        <button
          class="segment"
          :class="{ 'is-active': activeTab === 'brews' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'brews'"
          aria-label="Brews"
          @click="activeTab = 'brews'"
        >
          <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
            <path d="M13.4 5.7 15.4 1.8" />
            <path d="M6.4 8.5Q6.4 5.7 12 5.7T17.6 8.5Z" />
            <path d="M6.4 8.5 7.7 19.8Q7.85 21 9 21h6q1.15 0 1.3-1.2l1.3-11.3" />
            <path d="M7.1 13.5Q9.5 12.6 12 13.5T16.9 13.5" />
            <g fill="currentColor" stroke="none">
              <circle cx="9.8" cy="18.4" r="1" />
              <circle cx="12" cy="18.8" r="1" />
              <circle cx="14.2" cy="18.4" r="1" />
              <circle cx="10.9" cy="16.4" r="1" />
              <circle cx="13.1" cy="16.4" r="1" />
            </g>
          </svg>
        </button>

        <button
          class="segment"
          :class="{ 'is-active': activeTab === 'stamps' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'stamps'"
          aria-label="Stamps"
          @click="activeTab = 'stamps'"
        >
          <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
            <circle cx="12" cy="9" r="5.3" />
            <circle cx="12" cy="9" r="2" />
            <path d="M8.8 13.2 7 21 12 18.3 17 21 15.2 13.2" />
          </svg>
        </button>
      </div>

      <button class="round-button add" type="button" aria-label="Add entry" @click="openSheet()">
        <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
          <path d="M12 4v16M4 12h16" />
        </svg>
      </button>
    </nav>

    <Transition name="sheet">
      <DrinkDetailSheet
        v-if="detailOpen"
        :entry="entries[detailKey]"
        :date="detailKey"
        @close="detailOpen = false"
        @toggle-favourite="toggleFavourite"
      />
    </Transition>

    <Transition name="sheet">
      <AddDrinkSheet
        v-if="sheetOpen"
        :default-date-time="`${sheetDate}T${nowTime()}`"
        :recent="recentNames"
        :min-date="dateKey(1)"
        :max-date="dateKey(daysInMonth)"
        @close="sheetOpen = false"
        @save="addDrink"
      />
    </Transition>

    <Transition name="sheet">
      <ProfileSheet
        v-if="profileOpen"
        v-model:name="profileName"
        :entries="entries"
        @close="profileOpen = false"
        @view-stamps="goToStamps"
      />
    </Transition>

    <Transition name="sheet">
      <SettingsSheet v-if="settingsOpen" @close="settingsOpen = false" />
    </Transition>

    <Transition name="sheet">
      <PolaroidSheet v-if="photosOpen" :photos="photos" @close="photosOpen = false" />
    </Transition>

    <Transition name="fade">
      <SplashScreen v-if="showSplash" @done="showSplash = false" />
    </Transition>
  </div>
</template>

<style scoped>
.app {
  position: relative;
  max-width: 430px;
  min-height: 100dvh;
  margin: 0 auto;
  padding: max(env(safe-area-inset-top), 16px) 16px 130px;
  font-family: 'Courier New', Courier, monospace;
  color: var(--cream);
}

/* ---- top row ---- */
.top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.round-button {
  display: grid;
  place-items: center;
  width: 37px;
  height: 37px;
  border: 1px solid var(--button-border);
  border-radius: 50%;
  background: var(--button);
  color: var(--blue);
  cursor: pointer;
}

.icon {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.gear {
  width: 24px;
  height: 24px;
}

/* ---- heading ---- */
.title {
  margin: 7px 0 0;
  font-size: 33px;
  line-height: 36px;
  font-weight: 700;
  text-align: center;
  color: var(--cream);
}

.date {
  margin: 0 0 14px;
  font-size: 15px;
  line-height: 18px;
  letter-spacing: 1px;
  text-align: center;
  color: var(--muted);
}

/* ---- monthly / weekly switch ---- */
.view-toggle {
  display: flex;
  width: fit-content;
  margin: 0 auto 16px;
  padding: 3px;
  border: 1px solid var(--button-border);
  border-radius: 999px;
  background: var(--button);
}

.view-toggle button {
  height: 32px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--blue);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.view-toggle button.is-active {
  background: var(--pink);
  color: var(--maroon);
  font-weight: 700;
}

/* ---- cards ---- */
.card {
  border-radius: 24px;
  background: var(--card);
}

.calendar {
  /* polka dots on the card */
  background-image: radial-gradient(
    color-mix(in srgb, var(--pink) 10%, transparent) 1.6px,
    transparent 1.8px
  );
  background-size: 16px 16px;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 11px 7px;
  padding: 12px 16px 19px;
}

.weekday {
  font-size: 12.5px;
  line-height: 24px;
  font-weight: 700;
  text-align: center;
  color: var(--blue);
}

/* Sat + Sun */
.cal-head {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 4px 0;
}

.cal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 21px;
  line-height: 26px;
  font-weight: 700;
  color: var(--cream);
}

.spark-icon {
  width: 18px;
  height: 18px;
  fill: var(--pink);
  animation: twinkle 2.4s ease-in-out infinite;
}

.week-nav {
  display: flex;
  gap: 8px;
}

.week-nav button {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--button-border);
  border-radius: 50%;
  background: var(--button);
  color: var(--blue);
  cursor: pointer;
}

.week-nav button:disabled {
  opacity: 0.35;
  cursor: default;
}

.week-nav .icon {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.cal-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px 5px 8px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pink) 20%, transparent);
  font-size: 11.5px;
  font-weight: 700;
  color: var(--pink);
  cursor: pointer;
  transition: scale 0.15s ease;
}

.cal-chip:active {
  scale: 0.94;
}

.chip-icon {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

@keyframes twinkle {
  0%,
  100% {
    opacity: 0.55;
    transform: scale(0.8) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: scale(1.15) rotate(20deg);
  }
}

.weekday:nth-child(7),
.weekday:nth-child(8) {
  color: var(--pink);
}

.day {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 61 / 68;
  padding: 0;
  border: 0;
  border-radius: 14px;
  background: var(--cell);
  font: inherit;
  font-size: 13px;
  color: var(--cream);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--cream) 14%, transparent),
    0 3px 0 rgb(0 0 0 / 0.22);
  cursor: pointer;
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease;
}

.day:active {
  transform: translateY(3px) scale(0.96);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--cream) 14%, transparent);
}

/* Saturdays and Sundays are a touch pinker */
.day.is-weekend {
  background: color-mix(in srgb, var(--pink) 30%, var(--maroon));
}

/* days with a drink get a candy tint: pink, blue, cream */
.day.has-drink,
.day.is-weekend.has-drink {
  background: color-mix(in srgb, var(--tint) 26%, var(--maroon));
}

/* today glows softly */
.day.is-today,
.day.is-weekend.is-today {
  background: var(--pink);
  color: var(--maroon);
  animation: glow 2.4s ease-in-out infinite;
}

.day.is-today::after {
  content: '✦';
  position: absolute;
  top: -7px;
  right: -3px;
  z-index: 4;
  font-size: 15px;
  line-height: 1;
  color: var(--cream);
  text-shadow: 0 0 6px var(--pink);
  animation: twinkle 1.8s ease-in-out infinite;
}

.day.is-pop {
  animation: pop 0.55s cubic-bezier(0.3, 1.6, 0.5, 1);
}

@keyframes glow {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--pink) 55%, transparent);
  }
  50% {
    box-shadow: 0 0 0 7px transparent;
  }
}

@keyframes pop {
  0% {
    transform: scale(1);
  }
  25% {
    transform: scale(1.22) rotate(-6deg);
  }
  50% {
    transform: scale(1.12) rotate(5deg);
  }
  75% {
    transform: scale(1.16) rotate(-3deg);
  }
  100% {
    transform: scale(1);
  }
}

.burst {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}

.burst i {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 7px;
  height: 7px;
  margin: -3.5px;
  border-radius: 50%;
  background: var(--c);
  animation: spark 0.7s ease-out forwards;
}

@keyframes spark {
  from {
    opacity: 1;
    transform: rotate(var(--a)) translateY(-8px) scale(1);
  }
  to {
    opacity: 0;
    transform: rotate(var(--a)) translateY(-40px) scale(0.3);
  }
}

.day .sticker {
  position: absolute;
  inset: 0;
  z-index: 1; /* keep falling stickers above neighbouring cells */
  pointer-events: none;
  transform-origin: 50% 90%;
}

/* cups rock left and right: on hover with a mouse, or by themselves on touch screens */
@media (hover: hover) {
  .day:hover .sticker {
    animation: wiggle 1.4s ease-in-out infinite;
  }
}

.day .sticker.is-wiggle {
  animation: wiggle 1.4s ease-in-out;
}

@keyframes wiggle {
  0%,
  100% {
    transform: translateX(0) rotate(0deg);
  }
  25% {
    transform: translateX(-1.5px) rotate(-4deg);
  }
  75% {
    transform: translateX(1.5px) rotate(4deg);
  }
}

.day img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 2px;
  object-fit: contain;
  transform: rotate(var(--rest, 0deg));
  pointer-events: none;
  filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.35));
  animation: drop 1.3s var(--delay, 0s) both;
}

/* weekly view: one row of tall tiles */
.calendar--week .day {
  align-content: start;
  aspect-ratio: 41 / 104;
  padding-top: 7px;
}

.calendar--week .num {
  position: relative;
  z-index: 2;
}

.calendar--week .sticker {
  inset: 28px 1px 6px;
}

/* ---- widgets row ---- */
.widgets {
  display: grid;
  grid-template-columns: 1.76fr 1fr;
  gap: 21px;
  align-items: end;
  margin-top: 21px;
}

.summary {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  align-content: start;
  align-items: baseline;
  column-gap: 8px;
  min-height: 124px;
  padding: 20px 24px;
}

.summary h2 {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 14px;
  line-height: 18px;
  font-weight: 700;
  color: var(--blue);
}

/* rows share the two columns, so the labels stay aligned for any number of digits */
.stat {
  display: contents;
  font-size: 14px;
  line-height: 20px;
  color: var(--muted);
}

.stat > * {
  font-size: 14px;
  line-height: 20px;
}

.stat--big > * {
  margin: 4px 0 2px;
  line-height: 32px;
}

.stat--big .stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--cream);
}

.breakdown {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
  line-height: 16px;
  color: var(--muted);
}

.breakdown li {
  display: contents;
}

.breakdown .count {
  font-weight: 700;
  text-align: right;
  color: var(--cream);
}

.day img.is-photo,
.summary-drink.is-photo,
.favourites img.is-photo {
  border: 2px solid var(--cream);
  border-radius: 11px;
  object-fit: cover;
}

.day img.is-photo {
  inset: 3px;
  width: calc(100% - 6px);
  height: calc(100% - 6px);
  padding: 0;
}

.summary-drink.is-photo {
  width: 56px;
}

.summary-drink {
  position: absolute;
  right: 14px;
  bottom: 14px;
  height: 56px;
  animation: rise-in 0.6s var(--delay, 0s) cubic-bezier(0.3, 1.6, 0.4, 1) both;
}

/* pop up into the card and settle with a little wobble, rather than falling like the calendar cups */
@keyframes rise-in {
  0% {
    scale: 0.3;
    rotate: var(--tilt, 0deg);
    opacity: 0;
  }
  55% {
    scale: 1.1;
    rotate: calc(var(--rest, 0deg) - 5deg);
    opacity: 1;
  }
  78% {
    scale: 0.96;
    rotate: calc(var(--rest, 0deg) + 3deg);
  }
  100% {
    scale: 1;
    rotate: var(--rest, 0deg);
  }
}

/* fall from above the screen with gravity, then bounce twice and settle */
@keyframes drop {
  0% {
    translate: 0 -110vh;
    rotate: var(--tilt, 0deg);
    animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
  }
  58% {
    translate: 0 0;
    rotate: 0deg;
    animation-timing-function: cubic-bezier(0, 0.55, 0.45, 1);
  }
  74% {
    translate: 0 -14px;
    animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
  }
  87% {
    translate: 0 0;
    animation-timing-function: cubic-bezier(0, 0.55, 0.45, 1);
  }
  94% {
    translate: 0 -4px;
    animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
  }
  100% {
    translate: 0 0;
    rotate: 0deg;
  }
}

@media (prefers-reduced-motion: reduce) {
  .day img,
  .day .sticker,
  .summary-drink {
    animation: none;
  }
}

.folder-widget {
  display: block;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}

.folder-widget svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

/* ---- monthly favourites ---- */
.favourites {
  margin-top: 21px;
  padding: 16px 16px 14px;
}

.favourites h2 {
  margin: 0 0 10px 8px;
  font-size: 14px;
  line-height: 18px;
  font-weight: 700;
  color: var(--blue);
}

.favourites ul {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: calc((100% - 21px) / 4);
  gap: 7px;
  margin: 0;
  padding: 0;
  overflow-x: auto;
  list-style: none;
  scrollbar-width: none;
}

.favourites li {
  display: grid;
  gap: 2px;
  justify-items: center;
  padding: 6px 4px 8px;
  border-radius: 14px;
  background: var(--cell);
}

.favourites img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: contain;
}

.favourites li span {
  max-width: 100%;
  overflow: hidden;
  font-size: 11px;
  line-height: 14px;
  color: var(--cream);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- add screen transition ---- */
.sheet-enter-active,
.sheet-leave-active {
  transition:
    transform 0.35s cubic-bezier(0.32, 0.72, 0, 1),
    opacity 0.35s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

/* ---- splash screen transition ---- */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.35s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ---- bottom nav ---- */
.bottom-nav {
  position: fixed;
  right: 0;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 9px);
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.segmented {
  display: flex;
  width: 194px;
  height: 68px;
  padding: 4px;
  border: 1px solid var(--button-border);
  border-radius: 34px;
  background: var(--button);
}

.segment {
  flex: 1;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 30px;
  background: transparent;
  color: var(--blue);
  cursor: pointer;
  transition: background 0.2s ease;
}

.segment.is-active {
  background: color-mix(in srgb, var(--pink) 26%, var(--maroon));
  color: var(--pink);
}

.segment .icon {
  width: 36px;
  height: 36px;
  stroke-width: 1.4;
}

.add {
  width: 64px;
  height: 64px;
  color: var(--pink);
}

.add .icon {
  width: 28px;
  height: 28px;
  stroke-width: 2;
}
</style>
