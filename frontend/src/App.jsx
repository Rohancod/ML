import { useState } from 'react'
import './index.css'

const API_BASE = 'http://localhost:8000'

/* Today's date in YYYY-MM-DD (local) */
function todayStr() {
  return new Date().toISOString().split('T')[0]
}

/* Format a number to fixed decimals, with sign */
function fmt(v, d = 2) {
  if (v === undefined || v === null) return '—'
  const n = parseFloat(v)
  return (n >= 0 ? '+' : '') + n.toFixed(d)
}

// Session timing hint (IST = UTC+5:30)
const SESSION_TIMES = [
  { label: 'Asian Session',  utc: '00:00 – 08:00 UTC', ist: '05:30 – 13:30 IST', color: '#ef4444' },
  { label: 'London Session', utc: '08:00 – 13:30 UTC', ist: '13:30 – 19:00 IST', color: '#10b981' },
  { label: 'NY Opens',       utc: '13:00 UTC',          ist: '18:30 IST',          color: '#3b82f6' },
]

// Feature label mapping for the detail table
const FEATURE_META = [
  { key: 'Prev_Return',      label: 'Prev Day Return',    unit: '%',  session: 'Previous Day', color: '#8b5cf6' },
  { key: 'Prev_Range_Pct',   label: 'Prev Day Range',     unit: '%',  session: 'Previous Day', color: '#8b5cf6' },
  { key: 'Prev_Direction',   label: 'Prev Day Direction', unit: '',   session: 'Previous Day', color: '#8b5cf6' },
  { key: 'Asian_Return',     label: 'Asian Return',       unit: '%',  session: 'Asian',        color: '#ef4444' },
  { key: 'Asian_Range_Pct',  label: 'Asian Range',        unit: '%',  session: 'Asian',        color: '#ef4444' },
  { key: 'Asian_Direction',  label: 'Asian Direction',    unit: '',   session: 'Asian',        color: '#ef4444' },
  { key: 'London_Return',    label: 'London Return',      unit: '%',  session: 'London',       color: '#10b981' },
  { key: 'London_Range_Pct', label: 'London Range',       unit: '%',  session: 'London',       color: '#10b981' },
  { key: 'London_Direction', label: 'London Direction',   unit: '',   session: 'London',       color: '#10b981' },
  { key: 'Dist_Prev_High',   label: 'Dist. Prev High',    unit: '%',  session: 'NY Open',      color: '#3b82f6' },
  { key: 'Dist_Prev_Low',    label: 'Dist. Prev Low',     unit: '%',  session: 'NY Open',      color: '#3b82f6' },
]

function DirectionBadge({ value }) {
  // Model uses 0 = Bearish, 1 = Bullish (from notebook: (Close > Open).astype(int))
  const v = parseInt(value)
  if (v === 1) return <span className="dir-badge bullish">▲ Bullish (1)</span>
  return <span className="dir-badge bearish">▼ Bearish (0)</span>
}

function HowToUse() {
  return (
    <div className="card guide-content">
      <h2>How to Use the Predictor</h2>
      <p>Simply pick a trading date and click <strong>"Fetch &amp; Predict"</strong>. The system automatically fetches live BTC/USD data from Binance and computes all session features before running the ML model.</p>

      <div className="session-timing-grid">
        {SESSION_TIMES.map(s => (
          <div className="session-timing-card" key={s.label} style={{ borderTopColor: s.color }}>
            <div className="st-label" style={{ color: s.color }}>{s.label}</div>
            <div className="st-utc">{s.utc}</div>
            <div className="st-ist">{s.ist}</div>
          </div>
        ))}
      </div>

      <h3>Feature Descriptions</h3>
      <table className="guide-table">
        <thead>
          <tr><th>Feature</th><th>Session</th><th>Formula</th></tr>
        </thead>
        <tbody>
          <tr><td>Prev Return</td><td>Previous Day</td><td>(Close − Open) / Open × 100</td></tr>
          <tr><td>Prev Range %</td><td>Previous Day</td><td>(High − Low) / Open × 100</td></tr>
          <tr><td>Prev Direction</td><td>Previous Day</td><td>1 if Bullish, 0 if Bearish</td></tr>
          <tr><td>Asian Return</td><td>00:00–08:00 UTC</td><td>(Close − Open) / Open × 100</td></tr>
          <tr><td>Asian Range %</td><td>00:00–08:00 UTC</td><td>(High − Low) / Open × 100</td></tr>
          <tr><td>Asian Direction</td><td>00:00–08:00 UTC</td><td>1 if Bullish, 0 if Bearish</td></tr>
          <tr><td>London Return</td><td>08:00–13:30 UTC</td><td>(Close − Open) / Open × 100</td></tr>
          <tr><td>London Range %</td><td>08:00–13:30 UTC</td><td>(High − Low) / Open × 100</td></tr>
          <tr><td>London Direction</td><td>08:00–13:30 UTC</td><td>1 if Bullish, 0 if Bearish</td></tr>
          <tr><td>Dist. Prev High</td><td>NY Open (13:00 UTC)</td><td>(NY Open − Prev High) / Prev High × 100</td></tr>
          <tr><td>Dist. Prev Low</td><td>NY Open (13:00 UTC)</td><td>(NY Open − Prev Low) / Prev Low × 100</td></tr>
        </tbody>
      </table>

      <h3>Important Notes</h3>
      <ul>
        <li>The model predicts the <strong>NY session direction</strong> (13:00–20:00 UTC).</li>
        <li>For the prediction to work, the <strong>London session must have closed</strong> (after 13:30 UTC / 19:00 IST).</li>
        <li>Data is fetched live from <strong>Binance (BTCUSDT)</strong> — dates must have available market data.</li>
        <li>The model was trained on BTC/USD 1-minute data from 2020–2026.</li>
      </ul>
    </div>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('predict')
  const [selectedDate, setSelectedDate]  = useState('2025-08-29')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState('')
  const [showFeatures, setShowFeatures] = useState(false)

  const handlePredict = async () => {
    setError('')
    setResult(null)
    setShowFeatures(false)
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/predict-by-date?date=${selectedDate}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || `Server error ${res.status}`)
      }
      setResult(data)
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setError('Cannot connect to the API. Make sure your FastAPI server is running: uvicorn app:app --reload')
      } else {
        setError(err.message || 'An unexpected error occurred.')
      }
    } finally {
      setLoading(false)
    }
  }

  const isBullish    = result?.prediction === 1
  const probBullish  = result ? result.probability_class_1 : 0
  const probBearish  = result ? result.probability_class_0 : 0
  const confidence   = result ? Math.max(probBullish, probBearish) * 100 : 0

  return (
    <div className="container">
      <header className="header">
        <div className="header-tag">₿ BTC/USD · NY Session ML Predictor</div>
        <h1>NY Session Predictor</h1>
        <p>Enter a trade date — we automatically fetch Binance market data and compute all session features for you.</p>
      </header>

      <div className="tabs-container">
        <button className={`tab-btn ${activeTab === 'predict' ? 'active' : ''}`} onClick={() => setActiveTab('predict')}>
          Predict
        </button>
        <button className={`tab-btn ${activeTab === 'guide' ? 'active' : ''}`} onClick={() => setActiveTab('guide')}>
          How to Use
        </button>
      </div>

      {activeTab === 'guide' ? <HowToUse /> : (
        <>
          {/* ── Date Picker Card ── */}
          <div className="card date-card">
            <div className="date-card-inner">
              <div className="date-field-wrap">
                <label className="date-label" htmlFor="trade-date">Select Trade Date</label>
                <input
                  id="trade-date"
                  type="date"
                  className="date-input"
                  value={selectedDate}
                  max={todayStr()}
                  onChange={e => { setSelectedDate(e.target.value); setResult(null); setError('') }}
                />
              </div>

              <button
                id="predict-btn"
                className={`btn-primary${loading ? ' loading' : ''}`}
                onClick={handlePredict}
                disabled={loading || !selectedDate}
              >
                {loading ? (
                  <><span className="spinner"></span> Fetching &amp; Computing…</>
                ) : (
                  '⚡ Fetch & Predict'
                )}
              </button>
            </div>
            <div className="date-hint">Data fetched live from Binance (BTCUSDT 1-min)</div>

            {/* Session timing strip */}
            <div className="session-strip">
              {SESSION_TIMES.map(s => (
                <div className="ss-item" key={s.label}>
                  <span className="ss-dot" style={{ background: s.color }}></span>
                  <span className="ss-label">{s.label}</span>
                  <span className="ss-time">{s.ist}</span>
                </div>
              ))}
            </div>

            {error && (
              <div className="error-msg">
                <span>⚠️</span> {error}
              </div>
            )}
          </div>

          {/* ── Result Card ── */}
          {result && (
            <div className={`card result-card ${isBullish ? 'bullish-card' : 'bearish-card'}`}>
              <div className="result-top">
                <div className="result-left">
                  <div className="result-date">{result.date}</div>
                  <div className={`result-value ${isBullish ? 'bullish' : 'bearish'}`}>
                    {isBullish ? '▲ Bullish' : '▼ Bearish'}
                  </div>
                  <div className="result-sub">NY Session Direction (13:00–20:00 UTC)</div>
                </div>
                <div className="result-right">
                  <div className="confidence-ring">
                    <span className="conf-value">{confidence.toFixed(1)}%</span>
                    <span className="conf-label">Confidence</span>
                  </div>
                </div>
              </div>

              {/* Probability Bars */}
              <div className="prob-section">
                <div className="prob-item">
                  <div className="prob-row">
                    <span className="prob-name"><span className="prob-dot green"></span>Bullish (Class 1)</span>
                    <span className="prob-pct green">{(probBullish * 100).toFixed(1)}%</span>
                  </div>
                  <div className="prob-bar-bg">
                    <div className="prob-bar-fill green" style={{ width: `${probBullish * 100}%` }}></div>
                  </div>
                </div>
                <div className="prob-item" style={{ marginTop: '12px' }}>
                  <div className="prob-row">
                    <span className="prob-name"><span className="prob-dot red"></span>Bearish (Class 0)</span>
                    <span className="prob-pct red">{(probBearish * 100).toFixed(1)}%</span>
                  </div>
                  <div className="prob-bar-bg">
                    <div className="prob-bar-fill red" style={{ width: `${probBearish * 100}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Market data snapshot */}
              {result.market_data && (
                <div className="market-snapshot">
                  <div className="snapshot-item">
                    <span className="snap-label">Prev Close</span>
                    <span className="snap-value">${result.market_data.prev_close?.toLocaleString()}</span>
                  </div>
                  <div className="snapshot-item">
                    <span className="snap-label">NY Open</span>
                    <span className="snap-value">${result.market_data.ny_open_price?.toLocaleString()}</span>
                  </div>
                  <div className="snapshot-item">
                    <span className="snap-label">Prev High</span>
                    <span className="snap-value">${result.market_data.prev_high?.toLocaleString()}</span>
                  </div>
                  <div className="snapshot-item">
                    <span className="snap-label">Prev Low</span>
                    <span className="snap-value">${result.market_data.prev_low?.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Collapsible feature details */}
              <button className="toggle-features-btn" onClick={() => setShowFeatures(v => !v)}>
                {showFeatures ? '▲ Hide' : '▼ Show'} Computed Features
              </button>

              {showFeatures && result.features && (
                <div className="features-grid">
                  {FEATURE_META.map(f => {
                    const val = result.features[f.key]
                    const isDir = f.key.includes('Direction')
                    return (
                      <div className="feat-item" key={f.key} style={{ borderLeftColor: f.color }}>
                        <div className="feat-session" style={{ color: f.color }}>{f.session}</div>
                        <div className="feat-label">{f.label}</div>
                        <div className="feat-value">
                          {isDir
                            ? <DirectionBadge value={val} />
                            : <span style={{ color: parseFloat(val) >= 0 ? '#10b981' : '#ef4444' }}>{fmt(val)}%</span>
                          }
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <button className="btn-secondary" onClick={() => { setResult(null); setShowFeatures(false) }}>
                Clear Results
              </button>
            </div>
          )}
        </>
      )}

      <footer className="footer">
        &copy; {new Date().getFullYear()} NY Direction Predictor · BTC/USD ML Model · Data via Binance API
      </footer>
    </div>
  )
}
