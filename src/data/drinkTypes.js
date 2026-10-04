export const DRINK_TYPES = ['Home-made', 'Store-bought', 'Others']

// what kind of drink it is, shown as chips on the add screen
export const FLAVOURS = ['Coffee', 'Matcha', 'Boba', 'Tea', 'Cocktail', 'Soda', 'Others']

// Static data: how each drink (by date, matching the file name in src/assets/drinks/) was made.
// Drinks that are not listed here count as 'Others'.
export const drinkTypes = {
  '2026-09-03': 'Home-made',
  '2026-09-06': 'Home-made',
  '2026-09-10': 'Store-bought',
  '2026-09-12': 'Store-bought',
  '2026-09-13': 'Store-bought',
  '2026-09-14': 'Home-made',
  '2026-09-15': 'Store-bought',
  '2026-09-18': 'Home-made',
  '2026-09-22': 'Store-bought',
  '2026-09-23': 'Store-bought',
  '2026-09-24': 'Others',
  '2026-09-26': 'Others',
  '2026-09-29': 'Store-bought',
}

// quick-fill suggestions under "Last used" (drinks you add are put in front of these)
export const RECENT_DRINKS = ['Pumpkin spice latte', 'Ube matcha']
