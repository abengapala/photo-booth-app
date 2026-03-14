'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import imageCompression from 'browser-image-compression'

// ── Filters (Webcam Toy inspired) ────────────────────────────
const FILTERS = [
  { id: 'normal',   label: '✨ Normal',  css: 'none' },
  { id: 'soft',     label: '🌸 Soft',    css: 'brightness(1.1) saturate(0.85) contrast(0.92)' },
  { id: 'warm',     label: '🌅 Warm',    css: 'sepia(0.3) saturate(1.5) brightness(1.08) contrast(1.05)' },
  { id: 'pink',     label: '🩷 Pink',    css: 'sepia(0.15) saturate(2) hue-rotate(300deg) brightness(1.08)' },
  { id: 'vintage',  label: '📷 Vintage', css: 'sepia(0.55) contrast(1.15) brightness(0.92) saturate(0.8)' },
  { id: 'retro',    label: '🎞 Retro',   css: 'sepia(0.4) hue-rotate(15deg) saturate(1.6) contrast(1.15)' },
  { id: 'bw',       label: '🖤 B&W',     css: 'grayscale(1) contrast(1.15) brightness(1.05)' },
  { id: 'dramatic', label: '🎭 Drama',   css: 'grayscale(0.3) contrast(1.4) brightness(0.9) saturate(1.3)' },
  { id: 'lomo',     label: '🔴 Lomo',    css: 'saturate(1.8) contrast(1.3) brightness(0.85)' },
  { id: 'cold',     label: '🧊 Cold',    css: 'saturate(0.7) hue-rotate(195deg) brightness(1.1)' },
  { id: 'golden',   label: '✨ Golden',  css: 'sepia(0.4) saturate(1.6) brightness(1.12) hue-rotate(340deg)' },
  { id: 'dreamy',   label: '💫 Dreamy',  css: 'brightness(1.12) saturate(0.75) contrast(0.88)' },
]

// ── Layouts ───────────────────────────────────────────────────
const LAYOUTS = [
  { id: 1, label: '1 Pose',  count: 1 },
  { id: 2, label: '2 Poses', count: 2 },
  { id: 3, label: '3 Poses', count: 3 },
  { id: 4, label: '4 Poses', count: 4 },
]

// ── Steps ─────────────────────────────────────────────────────
// 'layout' → 'camera' → 'review' → 'strip'

export default function PhotoboothPage() {
  const router   = useRouter()
  const supabase = createClient()

  // auth guard
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/login')
    })
  }, [])

  const [step,      setStep]      = useState('layout')
  const [layout,    setLayout]    = useState(4)
  const [filter,    setFilter]    = useState('normal')
  const [shots,     setShots]     = useState([])       // { dataUrl, filter }[]
  const [current,   setCurrent]   = useState(0)        // which shot we're taking
  const [countdown, setCountdown] = useState(null)
  const [flashing,  setFlashing]  = useState(false)
  const [stripUrl,  setStripUrl]  = useState(null)     // generated strip data URL
  const [caption,   setCaption]   = useState('')
  const [uploading, setUploading] = useState(false)
  const [saved,     setSaved]     = useState(false)

  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const currentFilter = FILTERS.find(f => f.id === filter)

  // ── Camera ───────────────────────────────────────────────────
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      })
      streamRef.current          = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
    } catch {
      alert('No camera found 📷 — please allow camera permission or use the Upload tab!')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  useEffect(() => {
    if (step === 'camera') startCamera()
    else stopCamera()
    return () => stopCamera()
  }, [step])

  // ── Take one shot ─────────────────────────────────────────────
  const takeShot = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    const W = video.videoWidth  || 640
    const H = video.videoHeight || 480
    canvas.width  = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.filter = currentFilter.css === 'none' ? 'none' : currentFilter.css
    ctx.translate(W, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.9)
  }, [filter, currentFilter])

  // ── Auto countdown + capture ──────────────────────────────────
  async function captureWithCountdown() {
    for (let c = 3; c >= 1; c--) {
      setCountdown(c)
      await wait(1000)
    }
    setCountdown('📸')
    await wait(300)
    const dataUrl = takeShot()
    setFlashing(true)
    setTimeout(() => setFlashing(false), 200)
    setCountdown(null)
    return dataUrl
  }

  async function handleCapture() {
    const dataUrl = await captureWithCountdown()
    const newShots = [...shots]
    newShots[current] = { dataUrl, filterId: filter }
    setShots(newShots)
    if (current + 1 < layout) {
      setCurrent(current + 1)
    } else {
      setStep('review')
    }
  }

  function retakeShot(idx) {
    setCurrent(idx)
    setStep('camera')
  }

  // ── Generate strip on canvas ──────────────────────────────────
  async function generateStrip() {
    const FRAME_W = 420
    const FRAME_H = 320
    const PAD     = 14
    const FOOTER  = 60
    const STRIP_W = FRAME_W + PAD * 2
    const STRIP_H = PAD + (FRAME_H + PAD) * layout + FOOTER

    const canvas  = document.createElement('canvas')
    canvas.width  = STRIP_W
    canvas.height = STRIP_H
    const ctx     = canvas.getContext('2d')

    // background
    ctx.fillStyle = '#1a0f1e'
    ctx.fillRect(0, 0, STRIP_W, STRIP_H)

    // outer border
    ctx.strokeStyle = 'rgba(244,167,185,0.5)'
    ctx.lineWidth   = 2
    ctx.strokeRect(3, 3, STRIP_W - 6, STRIP_H - 6)

    // load ALL images first in parallel
    const images = await Promise.all(
      shots.slice(0, layout).map(shot => loadImage(shot.dataUrl))
    )

    // ── helper: draw image with object-fit: cover (center crop) ──
    function drawCover(ctx, img, x, y, w, h) {
      const imgRatio   = img.naturalWidth / img.naturalHeight
      const frameRatio = w / h
      let sx, sy, sw, sh

      if (imgRatio > frameRatio) {
        // image is wider than frame → crop sides
        sh = img.naturalHeight
        sw = sh * frameRatio
        sx = (img.naturalWidth - sw) / 2
        sy = 0
      } else {
        // image is taller than frame → crop top/bottom
        sw = img.naturalWidth
        sh = sw / frameRatio
        sx = 0
        sy = (img.naturalHeight - sh) / 2
      }
      ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
    }

    // draw each frame
    for (let i = 0; i < layout; i++) {
      const img = images[i]
      if (!img) continue

      const x = PAD
      const y = PAD + i * (FRAME_H + PAD)

      // clip to frame so image doesn't bleed outside
      ctx.save()
      ctx.beginPath()
      ctx.rect(x, y, FRAME_W, FRAME_H)
      ctx.clip()

      // frame background
      ctx.fillStyle = '#2c1f2e'
      ctx.fillRect(x, y, FRAME_W, FRAME_H)

      // apply filter
      const shot = shots[i]
      const f    = FILTERS.find(f => f.id === shot.filterId)
      ctx.filter  = (f && f.css !== 'none') ? f.css : 'none'

      // draw with cover crop — no stretching!
      drawCover(ctx, img, x, y, FRAME_W, FRAME_H)
      ctx.filter = 'none'
      ctx.restore()

      // frame border on top
      ctx.strokeStyle = 'rgba(244,167,185,0.3)'
      ctx.lineWidth   = 1
      ctx.strokeRect(x, y, FRAME_W, FRAME_H)
    }

    // footer
    const footerY = STRIP_H - FOOTER + 18
    ctx.fillStyle = 'rgba(244,167,185,0.85)'
    ctx.font      = 'italic 18px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText("Deidree's Album ♡", STRIP_W / 2, footerY)

    const date = new Date().toLocaleDateString('en-PH', {
      month: 'long', day: 'numeric', year: 'numeric',
      timeZone: 'Asia/Manila',
    })
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.font      = '13px sans-serif'
    ctx.fillText(date, STRIP_W / 2, footerY + 22)

    return canvas.toDataURL('image/jpeg', 0.93)
  }

  function loadImage(src) {
    return new Promise((res, rej) => {
      const img = new Image()
      img.onload  = () => res(img)
      img.onerror = rej
      img.src     = src
    })
  }

  async function handleGenerateStrip() {
    const url = await generateStrip()
    setStripUrl(url)
    setStep('strip')
  }

  // ── Download strip ────────────────────────────────────────────
  function downloadStrip() {
    const a    = document.createElement('a')
    a.href     = stripUrl
    a.download = `deidree_booth_${Date.now()}.jpg`
    a.click()
  }

  // ── Save to Supabase + notify Telegram ────────────────────────
  async function saveStrip() {
    setUploading(true)
    try {
      // convert dataUrl to blob
      const res  = await fetch(stripUrl)
      const blob = await res.blob()

      const compressed = await imageCompression(blob, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      })

      const path = `strip_${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage
        .from('photos')
        .upload(path, compressed, { contentType: 'image/jpeg' })
      if (upErr) throw upErr

      const { data } = supabase.storage.from('photos').getPublicUrl(path)
      const { data: { user } } = await supabase.auth.getUser()
      const uploadedAt = new Date().toISOString()

      await supabase.from('photos').insert({
        url:         data.publicUrl,
        caption:     caption || null,
        uploaded_by: user.id,
        created_at:  uploadedAt,
      })

      // Telegram notify
      try {
        await fetch('/api/notify', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photoUrl:   data.publicUrl,
            caption:    caption || `Photobooth strip — ${layout} poses 🎞`,
            uploadedAt,
          }),
        })
      } catch {
        console.log('Telegram notify failed but save succeeded')
      }

      setSaved(true)
    } catch (e) {
      alert('Save failed: ' + e.message)
    }
    setUploading(false)
  }

  function resetAll() {
    setStep('layout')
    setShots([])
    setCurrent(0)
    setStripUrl(null)
    setCaption('')
    setSaved(false)
    setFilter('normal')
  }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)) }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      {flashing && <div style={s.flash} />}

      {/* header */}
      <div style={s.header}>
        <div>
          <h1 style={s.logo}>📷 Deidree's Booth</h1>
          <p style={s.logoSub}>your photos, our memories ♡</p>
        </div>
        <button style={s.logout} onClick={handleLogout}>Sign out</button>
      </div>

      {/* ── STEP 1: LAYOUT PICKER ── */}
      {step === 'layout' && (
        <div style={s.center}>
          <h2 style={s.stepTitle}>Choose Your Layout</h2>
          <p style={s.stepSub}>How many poses do you want? 🌸</p>
          <div style={s.layoutGrid}>
            {LAYOUTS.map(l => (
              <div
                key={l.id}
                style={{ ...s.layoutCard, ...(layout === l.id ? s.layoutCardActive : {}) }}
                onClick={() => setLayout(l.id)}
              >
                <div style={s.layoutPreview}>
                  {[...Array(l.count)].map((_, i) => (
                    <div key={i} style={s.layoutFrame} />
                  ))}
                </div>
                <p style={s.layoutLabel}>{l.label}</p>
                <p style={s.layoutSub}>4×6</p>
              </div>
            ))}
          </div>
          <button style={s.btnPink} onClick={() => { setCurrent(0); setShots([]); setStep('camera') }}>
            Next →
          </button>
        </div>
      )}

      {/* ── STEP 2: CAMERA ── */}
      {step === 'camera' && (
        <div style={s.center}>
          <h2 style={s.stepTitle}>Get Ready to Pose!</h2>
          <p style={s.stepSub}>Shot {current + 1} of {layout} 📸</p>

          <div style={s.camWrap}>
            <video
              ref={videoRef}
              style={{ ...s.video, filter: currentFilter.css }}
              playsInline muted
            />
            {countdown !== null && (
              <div style={s.countdown}>{countdown}</div>
            )}
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* filters */}
          <div style={s.filterRow}>
            {FILTERS.map(f => (
              <button
                key={f.id}
                style={{ ...s.filterBtn, ...(filter === f.id ? s.filterBtnActive : {}) }}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* shot thumbnails progress */}
          <div style={s.shotProgress}>
            {[...Array(layout)].map((_, i) => (
              <div key={i} style={{
                ...s.shotThumb,
                ...(i === current ? s.shotThumbActive : {}),
                ...(shots[i] ? s.shotThumbDone : {}),
              }}>
                {shots[i]
                  ? <img src={shots[i].dataUrl} style={s.shotThumbImg} alt="" />
                  : <span style={{ color: i === current ? '#e879a0' : '#6b5070', fontSize: 13 }}>{i + 1}</span>
                }
              </div>
            ))}
          </div>

          <button style={s.btnPink} onClick={handleCapture} disabled={countdown !== null}>
            {countdown !== null ? `${countdown}` : '📸 Capture!'}
          </button>
        </div>
      )}

      {/* ── STEP 3: REVIEW ── */}
      {step === 'review' && (
        <div style={s.center}>
          <h2 style={s.stepTitle}>Review Your Shots</h2>
          <p style={s.stepSub}>Happy with these? Or retake some? 🌸</p>

          <div style={s.reviewGrid}>
            {shots.map((shot, i) => (
              <div key={i} style={s.reviewFrame}>
                <img src={shot.dataUrl} style={s.reviewImg} alt={`shot ${i+1}`} />
                <p style={s.reviewLabel}>Shot {i + 1}</p>
                <button style={s.retakeBtn} onClick={() => retakeShot(i)}>
                  🔄 Retake
                </button>
              </div>
            ))}
          </div>

          <input
            style={s.captionInput}
            placeholder="Add a caption (optional) ♡"
            value={caption}
            onChange={e => setCaption(e.target.value)}
          />

          <div style={s.btnRow}>
            <button style={s.btnOutline} onClick={resetAll}>Start Over</button>
            <button style={s.btnPink} onClick={handleGenerateStrip}>
              🎞 Generate Strip!
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: STRIP ── */}
      {step === 'strip' && (
        <div style={s.center}>
          <h2 style={s.stepTitle}>Your Photo Strip! 🎉</h2>
          <p style={s.stepSub}>Save it, download it, love it ♡</p>

          {stripUrl && (
            <img src={stripUrl} style={s.stripPreview} alt="photo strip" />
          )}

          {saved && (
            <p style={s.successMsg}>✨ Saved to our album! He can see it now 💕</p>
          )}

          <div style={s.btnRow}>
            <button style={s.btnOutline} onClick={resetAll}>New Strip</button>
            <button style={s.btnOutline} onClick={downloadStrip}>
              ⬇️ Download
            </button>
            {!saved && (
              <button
                style={{ ...s.btnPink, opacity: uploading ? 0.7 : 1 }}
                onClick={saveStrip}
                disabled={uploading}
              >
                {uploading ? 'Saving...' : '💾 Save to Album'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a0f1e 0%, #2c1f2e 60%, #1a1530 100%)',
    paddingBottom: '80px',
  },
  flash: {
    position: 'fixed', inset: 0,
    background: '#fff',
    opacity: 0.85,
    zIndex: 9999,
    pointerEvents: 'none',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(244,167,185,0.15)',
    background: 'rgba(0,0,0,0.3)',
    backdropFilter: 'blur(8px)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  logo: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '20px',
    color: '#fdf0f5',
  },
  logoSub: {
    fontSize: '11px',
    color: '#9b8fa0',
    marginTop: 2,
  },
  logout: {
    background: 'none',
    border: '1px solid rgba(244,167,185,0.3)',
    borderRadius: '10px',
    padding: '8px 14px',
    color: '#f4a7b9',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: "'DM Sans', sans-serif",
    WebkitTapHighlightColor: 'transparent',
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '28px 16px',
    gap: '20px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  stepTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '26px',
    color: '#fdf0f5',
    textAlign: 'center',
  },
  stepSub: {
    fontSize: '14px',
    color: '#9b8fa0',
    textAlign: 'center',
    marginTop: '-12px',
  },

  // layout picker
  layoutGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    width: '100%',
  },
  layoutCard: {
    background: 'rgba(255,255,255,0.05)',
    border: '1.5px solid rgba(244,167,185,0.15)',
    borderRadius: '16px',
    padding: '16px 8px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.2s',
    WebkitTapHighlightColor: 'transparent',
  },
  layoutCardActive: {
    border: '1.5px solid #e879a0',
    background: 'rgba(232,121,160,0.12)',
    boxShadow: '0 0 20px rgba(232,121,160,0.2)',
  },
  layoutPreview: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    width: '52px',
    minHeight: '80px',
    justifyContent: 'center',
  },
  layoutFrame: {
    width: '100%',
    height: '18px',
    borderRadius: '3px',
    background: 'rgba(244,167,185,0.25)',
    border: '1px solid rgba(244,167,185,0.2)',
  },
  layoutLabel: {
    color: '#fdf0f5',
    fontSize: '13px',
    fontWeight: '500',
    fontFamily: "'DM Sans', sans-serif",
    textAlign: 'center',
  },
  layoutSub: {
    color: '#9b8fa0',
    fontSize: '11px',
    fontFamily: "'DM Sans', sans-serif",
    marginTop: '-6px',
  },

  // camera
  camWrap: {
    width: '100%',
    maxWidth: '480px',
    aspectRatio: '4/3',
    borderRadius: '20px',
    overflow: 'hidden',
    position: 'relative',
    background: '#0f0a14',
    border: '2px solid rgba(244,167,185,0.2)',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)',
    display: 'block',
  },
  countdown: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '100px',
    color: '#fff',
    textShadow: '0 2px 24px rgba(0,0,0,0.6)',
    background: 'rgba(0,0,0,0.3)',
    fontFamily: "'Playfair Display', serif",
    pointerEvents: 'none',
  },

  // filters
  filterRow: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    width: '100%',
    paddingBottom: '6px',
    scrollbarWidth: 'none', // hide scrollbar Firefox
    WebkitOverflowScrolling: 'touch',
  },
  filterBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1.5px solid rgba(244,167,185,0.15)',
    borderRadius: '20px',
    padding: '8px 14px',
    color: '#9b8fa0',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: "'DM Sans', sans-serif",
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  filterBtnActive: {
    background: 'linear-gradient(135deg, #f4a7b9, #e879a0)',
    border: '1.5px solid transparent',
    color: '#fff',
    fontWeight: '500',
  },

  // shot progress
  shotProgress: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
  },
  shotThumb: {
    width: '52px',
    height: '52px',
    borderRadius: '10px',
    border: '2px solid rgba(244,167,185,0.2)',
    background: '#2c1f2e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shotThumbActive: {
    border: '2px solid #e879a0',
    boxShadow: '0 0 12px rgba(232,121,160,0.4)',
  },
  shotThumbDone: {
    border: '2px solid rgba(244,167,185,0.5)',
  },
  shotThumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  // review
  reviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    width: '100%',
  },
  reviewFrame: {
    borderRadius: '14px',
    overflow: 'hidden',
    background: '#2c1f2e',
    border: '1px solid rgba(244,167,185,0.15)',
    display: 'flex',
    flexDirection: 'column',
  },
  reviewImg: {
    width: '100%',
    aspectRatio: '4/3',
    objectFit: 'cover',
    display: 'block',
  },
  reviewOverlay: {
    display: 'none',
  },
  retakeBtn: {
    width: '100%',
    background: 'rgba(232,121,160,0.85)',
    color: '#fff',
    border: 'none',
    padding: '9px 8px',
    fontSize: '13px',
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer',
    fontWeight: '500',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
  },
  reviewLabel: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '11px',
    fontFamily: "'DM Sans', sans-serif",
    padding: '4px 0',
    background: '#1a0f1e',
  },

  // strip preview
  stripPreview: {
    width: '100%',
    maxWidth: '340px',
    borderRadius: '16px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
    border: '1px solid rgba(244,167,185,0.2)',
  },

  // shared
  captionInput: {
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1.5px solid rgba(244,167,185,0.2)',
    fontSize: '16px',
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    width: '100%',
  },
  btnRow: {
    display: 'flex',
    gap: '10px',
    width: '100%',
    flexWrap: 'wrap',
  },
  btnPink: {
    flex: 1,
    background: 'linear-gradient(135deg, #f4a7b9, #e879a0)',
    color: '#fff',
    border: 'none',
    borderRadius: '14px',
    padding: '16px 12px',
    fontSize: '15px',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: '500',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    boxShadow: '0 4px 16px rgba(232,121,160,0.3)',
  },
  btnOutline: {
    flex: 1,
    background: 'none',
    color: '#f4a7b9',
    border: '1.5px solid rgba(244,167,185,0.3)',
    borderRadius: '14px',
    padding: '16px 12px',
    fontSize: '15px',
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
  },
  successMsg: {
    textAlign: 'center',
    color: '#e879a0',
    background: 'rgba(232,121,160,0.1)',
    padding: '14px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '500',
    border: '1px solid rgba(232,121,160,0.2)',
    width: '100%',
  },
}
