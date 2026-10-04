export const STAMP_CATEGORIES = [
  { id: 'total', title: 'Milestones', hint: 'Every drink counts.' },
  // small round badges, not full-size stamp art — the original look, kept as-is on request
  { id: 'streaks', title: 'Streaks', hint: 'Keep the days going.', compact: true },
]

// each milestone: a stable id (also the sticker filename to drop into src/assets/stamps/),
// which stamp book section it lives in, and a goal checked against the stats below
export const MILESTONES = [
  { id: 'count-1', category: 'total', title: 'First Sip', emoji: '🥤', goal: (s) => s.total >= 1 },
  {
    id: 'count-10',
    category: 'total',
    title: '10 Drinks',
    emoji: '🥤',
    goal: (s) => s.total >= 10,
  },
  {
    id: 'count-25',
    category: 'total',
    title: '25 Drinks',
    emoji: '🥤',
    goal: (s) => s.total >= 25,
  },
  {
    id: 'count-50',
    category: 'total',
    title: '50 Drinks',
    emoji: '🥤',
    goal: (s) => s.total >= 50,
  },
  {
    id: 'count-100',
    category: 'total',
    title: 'Century Club',
    emoji: '💯',
    goal: (s) => s.total >= 100,
  },
  {
    id: 'count-200',
    category: 'total',
    title: 'Connoisseur',
    emoji: '👑',
    goal: (s) => s.total >= 200,
  },

  {
    id: 'streak-3',
    category: 'streaks',
    title: '3-Day Streak',
    emoji: '🔥',
    goal: (s) => s.longestStreak >= 3,
  },
  {
    id: 'streak-7',
    category: 'streaks',
    title: 'Full Week',
    emoji: '🔥',
    goal: (s) => s.longestStreak >= 7,
  },
  {
    id: 'streak-14',
    category: 'streaks',
    title: 'Two Weeks',
    emoji: '🔥',
    goal: (s) => s.longestStreak >= 14,
  },
  {
    id: 'streak-30',
    category: 'streaks',
    title: 'Whole Month',
    emoji: '🔥',
    goal: (s) => s.longestStreak >= 30,
  },
]

// longest run of consecutive calendar days found in a list of 'YYYY-MM-DD' keys
function longestRun(dateKeys) {
  const days = [...new Set(dateKeys)]
    .map((key) => {
      const [y, m, d] = key.split('-').map(Number)
      return Date.UTC(y, m - 1, d) / 86400000 // whole day index, DST-proof
    })
    .sort((a, b) => a - b)

  let best = 0
  let run = 0
  let prev = null
  for (const day of days) {
    run = day === prev + 1 ? run + 1 : 1
    prev = day
    best = Math.max(best, run)
  }
  return best
}

// stats are computed over every logged drink (all-time), not just the month in view
export function computeStats(entries) {
  const dated = Object.entries(entries).filter(([, entry]) => entry)
  return {
    total: dated.length,
    longestStreak: longestRun(dated.map(([key]) => key)),
    countries: new Set(dated.map(([, entry]) => entry.country).filter(Boolean)),
  }
}
