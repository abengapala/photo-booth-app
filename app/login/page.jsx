'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  // 👇 Replace with your exact emails from Supabase
  const GIRLFRIEND_EMAIL = 'deidreeannemedina@gmail.com'
  const BOYFRIEND_EMAIL  = 'albertoeder28@gmail.com'

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Wrong email or password. Try again!')
      setLoading(false)
      return
    }

    if (data.user.email === GIRLFRIEND_EMAIL) {
      router.push('/upload')
    } else if (data.user.email === BOYFRIEND_EMAIL) {
      router.push('/dashboard')
    }
  }

  return (
    <div style={s.page}>

      {/* fullscreen wallpaper */}
      <div style={s.wallpaper} />

      {/* dark overlay */}
      <div style={s.overlay} />

      {/* floating decorations */}
      <div style={{ ...s.floatDeco, top: '8%', left: '6%',  fontSize: 28, opacity: 0.35 }}>🎀</div>
      <div style={{ ...s.floatDeco, top: '15%', right: '8%', fontSize: 22, opacity: 0.3  }}>💗</div>
      <div style={{ ...s.floatDeco, bottom: '18%', left: '8%', fontSize: 20, opacity: 0.25 }}>✨</div>
      <div style={{ ...s.floatDeco, bottom: '10%', right: '6%', fontSize: 26, opacity: 0.3 }}>🌸</div>

      {/* login card */}
      <div style={s.card}>

        {/* branding */}
        <div style={s.brand}>
          <div style={s.brandIcon}>🎀</div>
          <h1 style={s.brandName}>Deidree's Album</h1>
          <p style={s.brandSub}>a place just for us ♡</p>
        </div>

        {/* divider */}
        <div style={s.divider}>
          <div style={s.dividerLine} />
          <span style={s.dividerText}>sign in</span>
          <div style={s.dividerLine} />
        </div>

        {/* form */}
        <div style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input
              style={s.input}
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input
              style={s.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {error && <p style={s.error}>{error}</p>}

          <button
            style={{ ...s.btn, opacity: loading ? 0.75 : 1 }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Enter our Album ♡'}
          </button>
        </div>

        <p style={s.footer}>made with love, just for Deidree 🩷</p>
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    minHeight: '100dvh', // fixes mobile browser bar
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  wallpaper: {
    position: 'fixed',
    inset: 0,
    backgroundImage: "url('/wallpaper.jpg')",
    backgroundSize: 'cover',
    backgroundPosition: 'center top',
    backgroundRepeat: 'no-repeat',
    zIndex: 0,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'linear-gradient(160deg, rgba(20,10,20,0.72) 0%, rgba(60,20,40,0.68) 50%, rgba(20,10,30,0.75) 100%)',
    zIndex: 1,
  },
  floatDeco: {
    position: 'fixed',
    zIndex: 2,
    pointerEvents: 'none',
    userSelect: 'none',
  },
  card: {
    position: 'relative',
    zIndex: 3,
    background: 'rgba(255, 245, 250, 0.10)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 192, 210, 0.25)',
    borderRadius: '28px',
    padding: '40px 32px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 8px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
  },
  brand: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  brandIcon: {
    fontSize: '44px',
    marginBottom: '10px',
    display: 'block',
    filter: 'drop-shadow(0 2px 8px rgba(244,167,185,0.6))',
  },
  brandName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '26px',
    fontWeight: '600',
    color: '#fff',
    letterSpacing: '0.01em',
    marginBottom: '6px',
    textShadow: '0 2px 12px rgba(244,167,185,0.4)',
  },
  brandSub: {
    fontSize: '13px',
    color: 'rgba(255,200,220,0.75)',
    fontStyle: 'italic',
    fontFamily: "'Playfair Display', serif",
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '24px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(255,192,210,0.2)',
  },
  dividerText: {
    fontSize: '11px',
    color: 'rgba(255,192,210,0.5)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    fontFamily: "'DM Sans', sans-serif",
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'rgba(255,210,225,0.8)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    fontFamily: "'DM Sans', sans-serif",
  },
  input: {
    padding: '14px 16px',
    borderRadius: '14px',
    border: '1px solid rgba(255,192,210,0.2)',
    fontSize: '16px', // prevents iOS zoom
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    transition: 'border 0.2s',
    WebkitTextFillColor: '#fff',
  },
  error: {
    fontSize: '13px',
    color: '#ffb3c6',
    textAlign: 'center',
    background: 'rgba(255,100,120,0.15)',
    padding: '10px',
    borderRadius: '10px',
    border: '1px solid rgba(255,100,120,0.2)',
  },
  btn: {
    background: 'linear-gradient(135deg, #f4a7b9, #e879a0)',
    color: '#fff',
    border: 'none',
    borderRadius: '14px',
    padding: '16px',
    fontSize: '15px',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '4px',
    letterSpacing: '0.02em',
    boxShadow: '0 4px 20px rgba(232,121,160,0.4)',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
  },
  footer: {
    textAlign: 'center',
    fontSize: '11px',
    color: 'rgba(255,192,210,0.4)',
    marginTop: '24px',
    fontStyle: 'italic',
    fontFamily: "'Playfair Display', serif",
  },
}
