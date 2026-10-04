<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, required: true }, // 'YYYY-MM-DDTHH:mm'
  minDate: { type: String, required: true }, // 'YYYY-MM-DD'
  maxDate: { type: String, required: true },
  todayKey: { type: String, required: true },
})
const emit = defineEmits(['update:modelValue', 'close'])

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const quickTimes = [
  { label: 'Morning', hour: 9 },
  { label: 'Noon', hour: 12 },
  { label: 'Afternoon', hour: 15 },
  { label: 'Evening', hour: 19 },
]

const pad = (n) => String(n).padStart(2, '0')
const dayKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`

const datePart = computed(() => props.modelValue.slice(0, 10))
const hour = computed(() => Number(props.modelValue.slice(11, 13)))
const minute = computed(() => Number(props.modelValue.slice(14, 16)))

// month being shown (starts on the month of the current value)
const shown = ref({
  y: Number(datePart.value.slice(0, 4)),
  m: Number(datePart.value.slice(5, 7)) - 1,
})

const title = computed(() =>
  new Date(shown.value.y, shown.value.m, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  }),
)

const days = computed(() => {
  const { y, m } = shown.value
  const lead = (new Date(y, m, 1).getDay() + 6) % 7 // weeks start on Monday
  const count = new Date(y, m + 1, 0).getDate()
  return [
    ...Array.from({ length: lead }, (_, i) => ({ key: `blank-${i}`, day: null })),
    ...Array.from({ length: count }, (_, i) => {
      const key = dayKey(y, m, i + 1)
      return {
        key,
        day: i + 1,
        disabled: key < props.minDate || key > props.maxDate,
        selected: key === datePart.value,
        today: key === props.todayKey,
        weekend: (lead + i) % 7 >= 5,
      }
    }),
  ]
})

const monthKey = computed(() => `${shown.value.y}-${pad(shown.value.m + 1)}`)
const canPrev = computed(() => monthKey.value > props.minDate.slice(0, 7))
const canNext = computed(() => monthKey.value < props.maxDate.slice(0, 7))

function moveMonth(delta) {
  const d = new Date(shown.value.y, shown.value.m + delta, 1)
  shown.value = { y: d.getFullYear(), m: d.getMonth() }
}

function emitValue(date, h, mi) {
  emit('update:modelValue', `${date}T${pad(h)}:${pad(mi)}`)
}

function pickDay(day) {
  if (!day.disabled) emitValue(day.key, hour.value, minute.value)
}

// step the time by some minutes, wrapping around midnight
function stepTime(delta) {
  const total = (hour.value * 60 + minute.value + delta + 1440) % 1440
  emitValue(datePart.value, Math.floor(total / 60), total % 60)
}

function setHour(h) {
  emitValue(datePart.value, h, 0)
}

function setNow() {
  const now = new Date()
  emitValue(datePart.value, now.getHours(), now.getMinutes())
}

function goToday() {
  const [y, m] = props.todayKey.split('-').map(Number)
  shown.value = { y, m: m - 1 }
  emitValue(props.todayKey, hour.value, minute.value)
}
</script>

<template>
  <div class="backdrop" @click.self="emit('close')">
    <div class="picker" role="dialog" aria-modal="true" aria-label="Pick a date and time">
      <span class="handle"></span>

      <header class="head">
        <h3>
          <svg viewBox="0 0 24 24" class="spark" aria-hidden="true">
            <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" />
          </svg>
          {{ title }}
        </h3>
        <div class="arrows">
          <button
            type="button"
            aria-label="Previous month"
            :disabled="!canPrev"
            @click="moveMonth(-1)"
          >
            <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button type="button" aria-label="Next month" :disabled="!canNext" @click="moveMonth(1)">
            <svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      </header>

      <div class="grid">
        <span
          v-for="(name, i) in weekdays"
          :key="name"
          class="weekday"
          :class="{ 'is-weekend': i > 4 }"
        >
          {{ name }}
        </span>

        <template v-for="day in days" :key="day.key">
          <span v-if="day.day === null"></span>
          <button
            v-else
            class="day"
            :class="{
              'is-selected': day.selected,
              'is-today': day.today,
              'is-weekend': day.weekend,
            }"
            type="button"
            :disabled="day.disabled"
            :aria-pressed="day.selected"
            @click="pickDay(day)"
          >
            {{ day.day }}
          </button>
        </template>
      </div>

      <div class="time">
        <div class="clock" aria-label="Time">
          <div class="unit">
            <button type="button" aria-label="Earlier by an hour" @click="stepTime(-60)">−</button>
            <span :key="hour" class="digits">{{ pad(hour) }}</span>
            <button type="button" aria-label="Later by an hour" @click="stepTime(60)">+</button>
          </div>
          <span class="colon">:</span>
          <div class="unit">
            <button type="button" aria-label="Earlier by five minutes" @click="stepTime(-5)">
              −
            </button>
            <span :key="minute" class="digits">{{ pad(minute) }}</span>
            <button type="button" aria-label="Later by five minutes" @click="stepTime(5)">+</button>
          </div>
        </div>

        <div class="quick">
          <button
            v-for="option in quickTimes"
            :key="option.label"
            type="button"
            :class="{ 'is-active': hour === option.hour && minute === 0 }"
            @click="setHour(option.hour)"
          >
            {{ option.label }}
          </button>
          <button type="button" @click="setNow">Now</button>
        </div>
      </div>

      <footer class="foot">
        <button class="ghost" type="button" @click="goToday">Today</button>
        <button class="done" type="button" @click="emit('close')">Done</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgb(0 0 0 / 0.55);
  font-family: 'Courier New', Courier, monospace;
  color: var(--cream);
}

.picker {
  position: relative;
  width: 100%;
  max-width: 430px;
  padding: 10px 16px calc(env(safe-area-inset-bottom, 0px) + 18px);
  border-radius: 28px 28px 0 0;
  background: color-mix(in srgb, var(--pink) 6%, var(--maroon));
  box-shadow: 0 -1px 0 var(--button-border);
  animation: rise 0.45s cubic-bezier(0.2, 1.25, 0.4, 1) both;
}

@keyframes rise {
  from {
    transform: translateY(60%);
    opacity: 0;
  }
}

.icon {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.handle {
  display: block;
  width: 40px;
  height: 4px;
  margin: 0 auto 10px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--cream) 25%, transparent);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.head h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 20px;
  line-height: 32px;
}

.spark {
  width: 18px;
  height: 18px;
  fill: var(--pink);
  animation: twinkle 2.4s ease-in-out infinite;
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

.arrows {
  display: flex;
  gap: 8px;
}

.arrows button {
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

.arrows button:disabled {
  opacity: 0.35;
  cursor: default;
}

/* month grid */
.grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px 6px;
  margin-top: 12px;
  padding: 12px 12px 14px;
  border-radius: 24px;
  background-color: var(--card);
  background-image: radial-gradient(
    color-mix(in srgb, var(--pink) 10%, transparent) 1.6px,
    transparent 1.8px
  );
  background-size: 16px 16px;
}

.weekday {
  font-size: 12px;
  font-weight: 700;
  line-height: 22px;
  text-align: center;
  color: var(--blue);
}

.weekday.is-weekend {
  color: var(--pink);
}

.day {
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  border-radius: 13px;
  background: var(--cell);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--cream) 14%, transparent),
    0 3px 0 rgb(0 0 0 / 0.22);
  color: var(--cream);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease;
}

.day.is-weekend {
  background: color-mix(in srgb, var(--pink) 30%, var(--maroon));
}

.day:active:not(:disabled) {
  transform: translateY(3px) scale(0.94);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--cream) 14%, transparent);
}

.day:disabled {
  opacity: 0.28;
  box-shadow: none;
  cursor: default;
}

.day.is-today {
  outline: 2px solid var(--blue);
  outline-offset: -2px;
}

.day.is-selected {
  position: relative;
  background: var(--pink);
  color: var(--maroon);
  font-weight: 700;
  animation: pop 0.4s cubic-bezier(0.3, 1.6, 0.5, 1);
}

.day.is-selected::after {
  content: '✦';
  position: absolute;
  top: -7px;
  right: -3px;
  font-size: 14px;
  line-height: 1;
  color: var(--cream);
  text-shadow: 0 0 6px var(--pink);
  animation: twinkle 1.8s ease-in-out infinite;
}

@keyframes pop {
  0% {
    transform: scale(0.8);
  }
  60% {
    transform: scale(1.18) rotate(-4deg);
  }
  100% {
    transform: scale(1);
  }
}

/* time */
.time {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.clock {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.unit {
  display: flex;
  align-items: center;
  gap: 6px;
}

.unit button {
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--button-border);
  border-radius: 50%;
  background: var(--button);
  color: var(--pink);
  font: inherit;
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}

.unit button:active {
  transform: scale(0.9);
}

.digits {
  display: grid;
  place-items: center;
  width: 56px;
  height: 52px;
  border-radius: 16px;
  background: var(--card);
  font-size: 28px;
  font-weight: 700;
  animation: tick 0.25s cubic-bezier(0.3, 1.6, 0.5, 1);
}

@keyframes tick {
  from {
    transform: translateY(-6px) scale(0.9);
    opacity: 0.4;
  }
}

.colon {
  font-size: 26px;
  font-weight: 700;
  color: var(--pink);
}

.quick {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.quick button {
  height: 32px;
  padding: 0 11px;
  border: 1px solid var(--button-border);
  border-radius: 16px;
  background: var(--cell);
  color: var(--cream);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.quick button.is-active {
  border-color: transparent;
  background: var(--blue);
  color: var(--maroon);
  font-weight: 700;
}

/* buttons */
.foot {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 10px;
  margin-top: 16px;
}

.foot button {
  height: 50px;
  border-radius: 25px;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

.ghost {
  border: 1px solid var(--button-border);
  background: var(--button);
  color: var(--blue);
}

.done {
  border: 0;
  background: var(--pink);
  color: var(--maroon);
}
</style>
