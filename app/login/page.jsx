'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router  = useRouter()
  const supabase = createClient()

  // 👇 Put your two user emails here
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
    console.log('User email:', data.user.email)        // 👈 ADD THIS TOO
    console.log('Girlfriend email:', GIRLFRIEND_EMAIL) // 👈 AND THIS
    // Redirect based on who logged in
    if (data.user.email === GIRLFRIEND_EMAIL) {
      router.push('/upload')
    } else if (data.user.email === BOYFRIEND_EMAIL) {
      router.push('/dashboard')
    }
  }

  return (
    <div style={styles.bg}>
      {/* Floating hearts decoration */}
      <div style={styles.hearts}>💗</div>

      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.emoji}>📷</span>
          <h1 style={styles.title}>Our Photo Booth</h1>
          <p style={styles.subtitle}>sign in to continue ♡</p>
        </div>

        <div style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In ♡'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  bg: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #fdf0f5 0%, #fdf6f0 50%, #f0f4fd 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  hearts: {
    position: 'absolute',
    top: '10%',
    right: '10%',
    fontSize: '80px',
    opacity: 0.15,
    pointerEvents: 'none',
    userSelect: 'none',
  },
  card: {
    background: '#fff',
    borderRadius: '24px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 8px 40px rgba(244,167,185,0.18)',
    border: '1px solid rgba(244,167,185,0.2)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '36px',
  },
  emoji: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '12px',
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '28px',
    fontWeight: '600',
    color: '#2c1f2e',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#9b8fa0',
    fontWeight: '300',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#2c1f2e',
    letterSpacing: '0.02em',
  },
  input: {
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1.5px solid #f0e4ea',
    fontSize: '15px',
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    transition: 'border 0.2s',
    background: '#fdf8fa',
    color: '#2c1f2e',
  },
  error: {
    fontSize: '13px',
    color: '#e07090',
    textAlign: 'center',
    background: '#fff0f4',
    padding: '10px',
    borderRadius: '10px',
  },
  btn: {
    background: 'linear-gradient(135deg, #f4a7b9, #e879a0)',
    color: '#fff',
    border: 'none',
    borderRadius: '14px',
    padding: '16px',
    fontSize: '16px',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '4px',
    transition: 'transform 0.15s, opacity 0.2s',
    letterSpacing: '0.02em',
  },
}