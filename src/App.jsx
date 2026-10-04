import './App.css'

const categories = ['all', 'matcha', 'boba', 'tea', 'soda']

const stats = [
  { value: '364', label: 'drinks' },
  { value: '18', label: 'favorites' },
  { value: '12', label: 'cities' },
]

const favorites = [
  { name: 'Brown Sugar Boba', place: 'Moro Tea', vibe: 'sweet & chewy', tint: '#f2d3a3' },
  { name: 'Matcha Cloud', place: 'Cafe Verve', vibe: 'soft & creamy', tint: '#cfe4bf' },
  { name: 'Berry Fizz', place: 'Basil & Co', vibe: 'sparkly & fresh', tint: '#f4bfd4' },
]

const entries = [
  { name: 'Matcha Cloud', type: 'homemade', city: 'Brussels', note: 'oat milk + vanilla', tint: '#cfe7c1' },
  { name: 'Milk Tea', type: 'store', city: 'Ghent', note: 'brown sugar boba', tint: '#efd3ad' },
  { name: 'Berry Soda', type: 'homemade', city: 'Antwerp', note: 'light and fizzy', tint: '#f5c8d8' },
  { name: 'Yuzu Tea', type: 'store', city: 'Rotterdam', note: 'citrus and calm', tint: '#bed7eb' },
]

const passport = [
  { icon: '✦', title: 'First sip', tag: 'milestone' },
  { icon: '◎', title: 'Brussels', tag: 'city' },
  { icon: '🧋', title: 'Moro', tag: 'shop' },
  { icon: '♡', title: 'Routine', tag: 'ritual' },
]

const stickers = [
  { label: 'matcha', tint: '#bddbb3' },
  { label: 'boba', tint: '#f1bf8a' },
  { label: 'soda', tint: '#f2a8c7' },
  { label: 'tea', tint: '#c0d9ee' },
]

function App() {
  return (
    <div className="drinkety-shell">
      <div className="drinkety-app">
        <header className="app-header">
          <div>
            <p className="eyebrow">good afternoon</p>
            <h1>Drinkety</h1>
          </div>
          <div className="avatar" aria-label="Profile">N</div>
        </header>

        <main className="app-main">
          <section className="hero-card">
            <div className="hero-copy">
              <span className="pill">today&apos;s mood</span>
              <h2>Soft matcha, sweet sips, and little rituals.</h2>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="cup"></div>
              <div className="foam"></div>
            </div>
          </section>

          <div className="chip-row" aria-label="Drink categories">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={category === 'all' ? 'chip-btn active' : 'chip-btn'}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="section-header">
            <span>favorites</span>
            <button type="button" className="mini-link">view all</button>
          </div>

          <section className="favorite-list">
            {favorites.map((drink) => (
              <article key={drink.name} className="favorite-card" style={{ '--card-tint': drink.tint }}>
                <div className="card-art" />
                <div className="card-copy">
                  <div>
                    <h3>{drink.name}</h3>
                    <small>{drink.place}</small>
                  </div>
                  <span>{drink.vibe}</span>
                </div>
              </article>
            ))}
          </section>

          <section className="stats-grid">
            {stats.map((stat) => (
              <article key={stat.label} className="stat-box">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </section>

          <div className="section-header">
            <span>recent sips</span>
            <button type="button" className="mini-link">all</button>
          </div>

          <section className="entry-list">
            {entries.map((entry) => (
              <article key={entry.name} className="entry-item">
                <div className="entry-icon" style={{ '--entry-tint': entry.tint }} />
                <div className="entry-text">
                  <div className="entry-top">
                    <h3>{entry.name}</h3>
                    <span>{entry.type}</span>
                  </div>
                  <p>{entry.city}</p>
                  <small>{entry.note}</small>
                </div>
              </article>
            ))}
          </section>

          <section className="passport-card">
            <div className="section-header compact">
              <span>passport</span>
              <button type="button" className="mini-link">collect</button>
            </div>

            <div className="passport-grid">
              {passport.map((stamp) => (
                <div key={stamp.title} className="stamp-item">
                  <span>{stamp.icon}</span>
                  <strong>{stamp.title}</strong>
                  <small>{stamp.tag}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="stickers-card">
            <div className="section-header compact">
              <span>sticker album</span>
              <button type="button" className="mini-link">make</button>
            </div>

            <div className="sticker-row">
              {stickers.map((sticker) => (
                <div key={sticker.label} className="sticker-item" style={{ '--sticker-tint': sticker.tint }}>
                  <div className="sticker-bubble" />
                  <span>{sticker.label}</span>
                </div>
              ))}
            </div>
          </section>
        </main>

        <nav className="bottom-nav" aria-label="Main navigation">
          <button type="button" className="nav-btn active">Home</button>
          <button type="button" className="nav-btn">Log</button>
          <button type="button" className="nav-btn">Stamp</button>
          <button type="button" className="nav-btn">Prefs</button>
        </nav>
      </div>
    </div>
  )
}

export default App
