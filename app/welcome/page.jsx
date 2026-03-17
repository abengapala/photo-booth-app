'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const QUOTES = [
  "you're the reason I smile for no reason at all 🌙",
  "every photo you take lives in my heart forever 💗",
  "i'd choose you in every lifetime, every universe 🌸",
  "you make ordinary days feel like magic ✨",
  "my favorite notification is always you 💌",
  "you're my favorite person to miss 🥺",
  "i fall for you a little more every single day 💕",
  "being yours is my favorite thing about life 🌷",
]

const CONFETTI_COLORS = [
  '#ff69b4','#ff1493','#ffb6c1','#ffd700',
  '#e879a0','#f4a7b9','#c77dff','#fff',
]

export default function WelcomePage() {
  const router = useRouter()
  const [phase,       setPhase]       = useState('hidden')   // hidden → burst → message → quote → done
  const [quote,       setQuote]       = useState('')
  const [confetti,    setConfetti]    = useState([])
  const [hearts,      setHearts]      = useState([])
  const [msgIndex,    setMsgIndex]    = useState(0)
  const [showContinue,setShowContinue]= useState(false)

  const MESSAGES = [
    { text: 'i miss you',        emoji: '🥺', delay: 0    },
    { text: 'so so so much',     emoji: '💗', delay: 1200 },
    { text: 'i love you',        emoji: '💕', delay: 2600 },
    { text: 'more than anything',emoji: '🌙', delay: 4000 },
  ]

  useEffect(() => {
    // pick random quote
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)])

    // generate confetti
    const pieces = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x:     Math.random() * 100,
      delay: Math.random() * 1.5,
      dur:   2.5 + Math.random() * 2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size:  6 + Math.random() * 8,
      rot:   Math.random() * 360,
    }))
    setConfetti(pieces)

    // generate floating hearts
    const h = Array.from({ length: 18 }, (_, i) => ({
      id:    i,
      x:     5 + Math.random() * 90,
      delay: Math.random() * 4,
      dur:   4 + Math.random() * 4,
      size:  14 + Math.random() * 22,
      opacity: 0.3 + Math.random() * 0.5,
    }))
    setHearts(h)

    // phase sequence
    setTimeout(() => setPhase('burst'),   300)
    setTimeout(() => setPhase('message'), 800)
    setTimeout(() => setPhase('quote'),   5500)
    setTimeout(() => setShowContinue(true), 6800)
  }, [])

  // animate messages one by one
  useEffect(() => {
    if (phase !== 'message') return
    let t
    MESSAGES.forEach((_, i) => {
      t = setTimeout(() => setMsgIndex(i), _.delay)
    })
    return () => clearTimeout(t)
  }, [phase])

  return (
    <div style={s.page}>

      {/* animated confetti */}
      {phase !== 'hidden' && confetti.map(c => (
        <div key={c.id} style={{
          position: 'fixed',
          left:  c.x + '%',
          top:   '-20px',
          width:  c.size + 'px',
          height: c.size + 'px',
          background: c.color,
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          transform: `rotate(${c.rot}deg)`,
          animation: `fall ${c.dur}s ${c.delay}s ease-in forwards`,
          zIndex: 5,
          pointerEvents: 'none',
        }} />
      ))}

      {/* floating hearts */}
      {hearts.map(h => (
        <div key={h.id} style={{
          position: 'fixed',
          left:    h.x + '%',
          bottom:  '-40px',
          fontSize: h.size + 'px',
          opacity:  h.opacity,
          animation: `float ${h.dur}s ${h.delay}s ease-in infinite`,
          zIndex: 3,
          pointerEvents: 'none',
        }}>♡</div>
      ))}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400;1,600&family=DM+Sans:wght@300;400;500&display=swap');

        @keyframes fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes float {
          0%   { transform: translateY(0) scale(1);    opacity: 0; }
          10%  { opacity: 0.6; }
          90%  { opacity: 0.4; }
          100% { transform: translateY(-110vh) scale(1.3); opacity: 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.12); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes bounce {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes glow {
          0%,100% { text-shadow: 0 0 20px rgba(244,167,185,0.4); }
          50%      { text-shadow: 0 0 40px rgba(244,167,185,0.9), 0 0 80px rgba(244,167,185,0.4); }
        }
      `}</style>

      {/* ── MESSAGE PHASE ── */}
      {(phase === 'message' || phase === 'burst') && (
        <div style={s.messageWrap}>
          <div style={{ ...s.bigEmoji, animation: 'pulse 1.5s ease-in-out infinite' }}>
            {MESSAGES[msgIndex]?.emoji}
          </div>

          {MESSAGES.map((m, i) => (
            <div key={i} style={{
              ...s.messageText,
              opacity:   msgIndex >= i ? 1 : 0,
              transform: msgIndex >= i ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
              fontSize:  i === 0 ? '42px' : i === 2 ? '52px' : '36px',
              color:     i === 2 ? '#ff69b4' : '#fdf0f5',
              fontStyle: i % 2 === 0 ? 'italic' : 'normal',
            }}>
              {m.text}
            </div>
          ))}
        </div>
      )}

      {/* ── QUOTE PHASE ── */}
      {phase === 'quote' && (
        <div style={s.quoteWrap}>

          {/* top decoration */}
          <div style={s.topDeco}>
            <span style={{ animation: 'bounce 1.5s ease-in-out infinite', display: 'inline-block' }}>🎀</span>
            <span style={s.decoLine} />
            <span style={{ animation: 'bounce 1.5s ease-in-out infinite 0.3s', display: 'inline-block' }}>🎀</span>
          </div>

          {/* this is just for you */}
          <p style={s.forYouLabel}>this is just for you</p>

          {/* main quote card */}
          <div style={s.quoteCard}>
            <div style={s.quoteMark}>"</div>
            <p style={s.quoteText}>{quote}</p>
            <div style={{ ...s.quoteMark, alignSelf: 'flex-end', transform: 'rotate(180deg)' }}>"</div>
          </div>

          {/* from signature */}
          <div style={s.fromWrap}>
            <div style={s.fromLine} />
            <p style={s.fromText}>— from the one who loves you most 💕</p>
            <div style={s.fromLine} />
          </div>

          {/* small hearts */}
          <div style={s.miniHearts}>
            {['💗','🌸','✨','💕','🥺','🌙'].map((h, i) => (
              <span key={i} style={{
                fontSize: '20px',
                animation: `bounce 2s ease-in-out infinite ${i * 0.2}s`,
                display: 'inline-block',
              }}>{h}</span>
            ))}
          </div>

          {/* continue button */}
          {showContinue && (
            <button
              style={s.continueBtn}
              onClick={() => router.push('/upload')}
            >
              enter our booth ♡
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    minHeight: '100dvh',
    background: 'linear-gradient(160deg, #1a0f2e 0%, #2d0a1e 40%, #1a0f2e 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    fontFamily: "'DM Sans', sans-serif",
  },

  // message phase
  messageWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '40px 24px',
    zIndex: 10,
    textAlign: 'center',
    animation: 'fadeUp 0.6s ease-out',
  },
  bigEmoji: {
    fontSize: '72px',
    marginBottom: '8px',
    display: 'block',
  },
  messageText: {
    fontFamily: "'Playfair Display', serif",
    fontWeight: '600',
    lineHeight: 1.2,
    letterSpacing: '-0.01em',
  },

  // quote phase
  quoteWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    padding: '32px 24px',
    maxWidth: '440px',
    width: '100%',
    zIndex: 10,
    animation: 'fadeUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  topDeco: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '24px',
  },
  decoLine: {
    width: '60px',
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(244,167,185,0.6), transparent)',
    display: 'inline-block',
  },
  forYouLabel: {
    fontFamily: "'Playfair Display', serif",
    fontStyle: 'italic',
    fontSize: '15px',
    color: 'rgba(244,167,185,0.7)',
    letterSpacing: '0.12em',
    textTransform: 'lowercase',
  },
  quoteCard: {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(244,167,185,0.2)',
    borderRadius: '24px',
    padding: '32px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    boxShadow: '0 8px 40px rgba(244,167,185,0.1), inset 0 1px 0 rgba(255,255,255,0.08)',
    position: 'relative',
    overflow: 'hidden',
  },
  quoteMark: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '52px',
    color: 'rgba(244,167,185,0.3)',
    lineHeight: 0.8,
    alignSelf: 'flex-start',
  },
  quoteText: {
    fontFamily: "'Playfair Display', serif",
    fontStyle: 'italic',
    fontSize: '20px',
    lineHeight: 1.6,
    color: '#fdf0f5',
    textAlign: 'center',
    animation: 'glow 3s ease-in-out infinite',
  },
  fromWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
  },
  fromLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(244,167,185,0.2)',
  },
  fromText: {
    fontSize: '12px',
    color: 'rgba(244,167,185,0.6)',
    fontStyle: 'italic',
    fontFamily: "'Playfair Display', serif",
    whiteSpace: 'nowrap',
  },
  miniHearts: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  continueBtn: {
    marginTop: '8px',
    background: 'linear-gradient(135deg, #f4a7b9, #e879a0)',
    color: '#fff',
    border: 'none',
    borderRadius: '50px',
    padding: '16px 36px',
    fontSize: '16px',
    fontFamily: "'Playfair Display', serif",
    fontStyle: 'italic',
    cursor: 'pointer',
    boxShadow: '0 4px 24px rgba(232,121,160,0.45)',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    animation: 'fadeUp 0.6s ease-out, pulse 2s ease-in-out infinite 0.6s',
    letterSpacing: '0.02em',
  },
}
