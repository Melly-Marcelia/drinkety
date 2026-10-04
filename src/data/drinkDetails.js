// Static data: extra details shown when a drink is tapped on the calendar, by date
// (matching the file name in src/assets/drinks/). Every field is optional:
//   name, flavour (one of FLAVOURS), shop, city, country (ISO alpha-2, see src/data/countries.js), notes, time ('HH:mm')
// The shops below are read off the cups themselves; fill in the rest as you like.
export const drinkDetails = {
  '2026-09-03': { flavour: 'Matcha' },
  '2026-09-06': { flavour: 'Matcha' },
  '2026-09-10': { flavour: 'Matcha', shop: 'Chi Cha' },
  '2026-09-14': { flavour: 'Matcha' },
  '2026-09-15': { flavour: 'Matcha', shop: 'The Matcha Kyoto', city: 'Kyoto', country: 'JP' },
  '2026-09-22': { flavour: 'Matcha', shop: 'Chi Cha' },
  '2026-09-23': { shop: 'Starbucks' },
  '2026-09-24': { flavour: 'Coffee' },
  '2026-09-29': { flavour: 'Coffee', shop: 'SSENSE', city: 'Montreal', country: 'CA' },
}
