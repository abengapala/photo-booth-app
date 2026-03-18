'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import imageCompression from 'browser-image-compression'
import StickerCanvas from '@/components/StickerCanvas'

// ── Filters ───────────────────────────────────────────────────
const NORMAL_FILTERS = [
  { id: 'normal',  label: 'Normal',  css: 'none',                                              matrix: null },
  { id: 'bw',      label: 'B&W',     css: 'grayscale(1) contrast(1.3) brightness(1.05)',        matrix: [0.299,0.587,0.114,0,0, 0.299,0.587,0.114,0,0, 0.299,0.587,0.114,0,0, 0,0,0,1,0] },
  { id: 'dreamy',  label: 'Dreamy',  css: 'brightness(1.2) saturate(0.5) contrast(0.75)',       matrix: [0.85,0,0,0,0.15, 0,0.85,0,0,0.12, 0,0,0.85,0,0.15, 0,0,0,1,0] },
  { id: 'warm',    label: 'Warm',    css: 'sepia(0.6) saturate(1.8) brightness(1.1)',           matrix: [1.4,0.2,0,0,0.08, 0.1,1.0,0,0,0.03, 0,0,0.5,0,-0.1, 0,0,0,1,0] },
  { id: 'vintage', label: 'Vintage', css: 'sepia(0.8) contrast(1.2) brightness(0.9)',           matrix: [1.0,0.3,0.1,0,0, 0.1,0.8,0.1,0,0, 0.05,0.15,0.45,0,0, 0,0,0,1,0] },
  { id: 'cold',    label: 'Cold',    css: 'saturate(0.6) hue-rotate(200deg) brightness(1.15)', matrix: [0.6,0,0.3,0,0.05, 0,0.7,0.2,0,0.05, 0.1,0.1,1.4,0,0.05, 0,0,0,1,0] },
  { id: 'pink',    label: 'Pink',    css: 'sepia(0.2) saturate(2.5) hue-rotate(300deg)',        matrix: [1.5,0,0.3,0,0.05, 0,0.7,0.1,0,0, 0.2,0,0.8,0,0.05, 0,0,0,1,0] },
  { id: 'golden',  label: 'Golden',  css: 'sepia(0.6) saturate(2) brightness(1.15)',            matrix: [1.5,0.2,0,0,0.1, 0.1,1.1,0,0,0.05, 0,0,0.4,0,-0.1, 0,0,0,1,0] },
]
const BEAUTY_FILTERS = [
  { id: 'smooth',    label: '✨ Smooth',    css: 'brightness(1.08) contrast(0.88) saturate(0.9)',    matrix: [0.98,0,0,0,0.04, 0,0.95,0,0,0.04, 0,0,0.95,0,0.04, 0,0,0,1,0] },
  { id: 'blush',     label: '🌸 Blush',     css: 'brightness(1.1) saturate(1.3) hue-rotate(340deg)', matrix: [1.15,0.05,0.05,0,0.04, 0.05,0.9,0.05,0,0.02, 0.05,0,0.82,0,0.02, 0,0,0,1,0] },
  { id: 'makeup',    label: '💄 Makeup',    css: 'contrast(1.1) saturate(1.4) brightness(1.05)',     matrix: [1.1,0.05,0,0,0.02, 0,1.05,0.05,0,0.01, 0,0.05,0.95,0,-0.02, 0,0,0,1,0] },
  { id: 'glow',      label: '💫 Glow',      css: 'brightness(1.2) contrast(0.9) saturate(1.1)',      matrix: [1.0,0,0,0,0.1, 0,1.0,0,0,0.08, 0,0,0.98,0,0.08, 0,0,0,1,0] },
  { id: 'porcelain', label: '🤍 Porcelain', css: 'brightness(1.15) contrast(0.85) saturate(0.75)',   matrix: [0.92,0,0,0,0.1, 0,0.92,0,0,0.08, 0,0,0.9,0,0.1, 0,0,0,1,0] },
  { id: 'natural',   label: '🌿 Natural',   css: 'brightness(1.06) contrast(0.95) saturate(1.1)',    matrix: [1.02,0,0,0,0.02, 0,1.02,0,0,0.02, 0,0,0.98,0,0.01, 0,0,0,1,0] },
]
const ALL_FILTERS = [...NORMAL_FILTERS, ...BEAUTY_FILTERS]

// ── Layouts ───────────────────────────────────────────────────
const LAYOUTS = [
  { id: 1,     label: '1 Pose',   count: 1 },
  { id: 2,     label: '2 Poses',  count: 2 },
  { id: 3,     label: '3 Poses',  count: 3 },
  { id: 4,     label: '4 Poses',  count: 4 },
  { id: '2x2', label: '2×2 Grid', count: 4, grid: true },
]

// ── THEMES — add imgData from lib/themeImages.js ──────────────
// To use artist photos: import THEME_IMAGES from '@/lib/themeImages'
// then set imgData: THEME_IMAGES.olivia etc.
// For now using null — add images after setting up themeImages.js
const THEMES = [
  { id:'dark',      label:'Classic',    emoji:'🖤', bg:'#1a0f1e',  border:'rgba(244,167,185,0.5)', frameBorder:'rgba(244,167,185,0.3)', footerColor:'rgba(244,167,185,0.85)', footerText:"Deidree's Album ♡",    dateColor:'rgba(255,255,255,0.35)', imgData:null },
  { id:'deidree',   label:'Deidree',    emoji:'🎀', bg:'#2d0a1e',  border:'#ff69b4',               frameBorder:'#ff69b4',               footerColor:'#ff69b4',               footerText:'🎀 Deidree 🎀',          dateColor:'rgba(255,182,193,0.7)',  imgData:null },
  { id:'olivia',    label:'Olivia R.',  emoji:'💜', bg:'#0d0010',  border:'#9b59b6',               frameBorder:'#6c3483',               footerColor:'#d98ef0',               footerText:'★ brutal ★ good 4 u ★', dateColor:'rgba(200,150,230,0.6)',  imgData:null },
  { id:'ariana',    label:'Ariana G.',  emoji:'🌙', bg:'#1a000a',  border:'#ff1493',               frameBorder:'#c71585',               footerColor:'#ff69b4',               footerText:'✨ thank u, next ✨',     dateColor:'rgba(255,182,193,0.6)',  imgData:null },
  { id:'taylor',    label:'Taylor S.',  emoji:'🌟', bg:'#0a0505',  border:'#c9a84c',               frameBorder:'#c9a84c',               footerColor:'#f0d060',               footerText:'✦ 1989 ✦ eras tour ✦',  dateColor:'rgba(210,180,100,0.6)', imgData:null },
  { id:'sabrina',   label:'Sabrina C.', emoji:'🌻', bg:'#0a1020',  border:'#ffd700',               frameBorder:'#ffd700',               footerColor:'#ffd700',               footerText:'☆ please please please ☆',dateColor:'rgba(255,215,0,0.5)',   imgData:null },
  { id:'loudhouse', label:'Loud House', emoji:'🏠', bg:'#ffffff',  border:'#000000',               frameBorder:'#000000',               footerColor:'#e31c25',               footerText:'★ THE LOUD HOUSE ★',     dateColor:'#555',                  imgData:null, textOnLight:true },
  { id:'pink',      label:'Pink Cute',  emoji:'🌸', bg:'#fff0f5',  border:'#ff9dbb',               frameBorder:'#ffb6cb',               footerColor:'#e8698a',               footerText:'🌸 cute & pretty 🌸',    dateColor:'rgba(200,80,120,0.5)',   imgData:null, textOnLight:true },
  { id:'aesthetic', label:'Aesthetic',  emoji:'🤍', bg:'#f5f5f0',  border:'#bbb',                  frameBorder:'#ccc',                  footerColor:'#666',                  footerText:'film . memories . us',   dateColor:'rgba(100,100,100,0.5)', imgData:null, textOnLight:true },
]

// ── NOTE: To add artist photos to themes ──────────────────────
// 1. Make sure lib/themeImages.js exists (download from earlier)
// 2. Add this import at the top:
//    import THEME_IMAGES from '@/lib/themeImages'
// 3. Then update each theme's imgData like:
//    { id:'olivia', ..., imgData: THEME_IMAGES.olivia }
// ─────────────────────────────────────────────────────────────

// ── Filter pixel manipulation ─────────────────────────────────
function applyMatrixFilter(srcCanvas, matrix) {
  const W = srcCanvas.width, H = srcCanvas.height
  const out = document.createElement('canvas')
  out.width = W; out.height = H
  const ctx = out.getContext('2d')
  const src = srcCanvas.getContext('2d').getImageData(0, 0, W, H)
  const dst = ctx.createImageData(W, H)
  const d = src.data, o = dst.data, m = matrix
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2], a = d[i+3]
    o[i]   = clamp(m[0]*r  + m[1]*g  + m[2]*b  + m[3]*a  + m[4]*255)
    o[i+1] = clamp(m[5]*r  + m[6]*g  + m[7]*b  + m[8]*a  + m[9]*255)
    o[i+2] = clamp(m[10]*r + m[11]*g + m[12]*b + m[13]*a + m[14]*255)
    o[i+3] = a
  }
  ctx.putImageData(dst, 0, 0)
  return out
}
function clamp(v) { return Math.min(255, Math.max(0, Math.round(v))) }

function captureFrame(videoEl, filterObj, mirror) {
  const W = videoEl.videoWidth  || 640
  const H = videoEl.videoHeight || 480
  const raw = document.createElement('canvas')
  raw.width = W; raw.height = H
  const rawCtx = raw.getContext('2d')
  if (mirror) { rawCtx.translate(W, 0); rawCtx.scale(-1, 1) }
  rawCtx.drawImage(videoEl, 0, 0)
  if (mirror) rawCtx.setTransform(1, 0, 0, 1, 0, 0)
  if (filterObj && filterObj.matrix) {
    return applyMatrixFilter(raw, filterObj.matrix).toDataURL('image/jpeg', 0.92)
  }
  return raw.toDataURL('image/jpeg', 0.92)
}

export default function PhotoboothPage() {
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/login')
    })
  }, [])

  const [step,           setStep]           = useState('layout')
  const [layout,         setLayout]         = useState(4)
  const [layoutGrid,     setLayoutGrid]     = useState(false)
  const [theme,          setTheme]          = useState('dark')
  const [filterTab,      setFilterTab]      = useState('normal')
  const [filter,         setFilter]         = useState('normal')
  const [shots,          setShots]          = useState([])
  const [current,        setCurrent]        = useState(0)
  const [countdown,      setCountdown]      = useState(null)
  const [flashing,       setFlashing]       = useState(false)
  const [stripUrl,       setStripUrl]       = useState(null)
  const [caption,        setCaption]        = useState('')
  const [uploading,      setUploading]      = useState(false)
  const [saved,          setSaved]          = useState(false)
  const [facingMode,     setFacingMode]     = useState('user')
  const [processing,     setProcessing]     = useState(false)
  const [flashOn,        setFlashOn]        = useState(false)
  const [stickerMode,    setStickerMode]    = useState(false)
  const [stickerShotIdx, setStickerShotIdx] = useState(0)

  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)
  const streamRef  = useRef(null)
  const overlayRef = useRef(null)

  const currentFilters = filterTab === 'normal' ? NORMAL_FILTERS : BEAUTY_FILTERS
  const currentFilter  = ALL_FILTERS.find(f => f.id === filter) || ALL_FILTERS[0]
  const currentTheme   = THEMES.find(t => t.id === theme) || THEMES[0]

  // ── Camera ────────────────────────────────────────────────────
  async function startCamera(facing) {
    const mode = facing ?? facingMode
    try {
      streamRef.current?.getTracks().forEach(t => t.stop())
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode } }, audio: false,
      })
      streamRef.current = stream
      const vid = videoRef.current
      vid.setAttribute('autoplay',''); vid.setAttribute('muted',''); vid.setAttribute('playsinline','')
      vid.muted = true; vid.srcObject = stream
      await new Promise(r => setTimeout(r, 150))
      await vid.play()
    } catch (err) {
      if (err.name === 'NotAllowedError') alert('📷 Camera blocked!\n\niPhone: Settings → Safari → Camera → Allow!')
      else alert('📷 Camera error: ' + err.message)
    }
  }

  async function switchCamera() {
    const next = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(next); await startCamera(next)
  }

  function stopCamera() { streamRef.current?.getTracks().forEach(t => t.stop()) }

  useEffect(() => {
    if (step === 'camera') startCamera(facingMode)
    else stopCamera()
    return () => stopCamera()
  }, [step])

  function triggerFlash() {
    if (!flashOn || !overlayRef.current) return
    overlayRef.current.style.opacity = '1'
    setTimeout(() => { if (overlayRef.current) overlayRef.current.style.opacity = '0' }, 120)
  }

  async function handleCaptureSimple() {
    if (processing) return
    setProcessing(true)
    for (let c = 3; c >= 1; c--) { setCountdown(c); await wait(1000) }
    setCountdown('📸'); await wait(300)
    triggerFlash()
    const mirror  = facingMode === 'user'
    const dataUrl = captureFrame(videoRef.current, currentFilter, mirror)
    setFlashing(true); setTimeout(() => setFlashing(false), 200)
    setCountdown(null)
    const newShots = [...shots]
    newShots[current] = { dataUrl, filterId: filter }
    setShots(newShots)
    if (current + 1 < layout) setCurrent(current + 1)
    else setStep('review')
    setProcessing(false)
  }

  function retakeShot(idx) { setCurrent(idx); setStep('camera') }

  function openStickers(idx) { setStickerShotIdx(idx); setStickerMode(true) }
  function onStickerDone(newDataUrl) {
    const updated = [...shots]
    updated[stickerShotIdx] = { ...updated[stickerShotIdx], dataUrl: newDataUrl }
    setShots(updated); setStickerMode(false)
  }

  // ── Generate themed strip ─────────────────────────────────────
  async function generateStrip() {
    const t       = currentTheme
    const isGrid  = layoutGrid
    const FRAME_W = isGrid ? 200 : 400
    const FRAME_H = isGrid ? 200 : 290
    const PAD     = 14
    const FOOTER  = 64
    let STRIP_W, STRIP_H

    if (isGrid) {
      STRIP_W = PAD + FRAME_W + PAD/2 + FRAME_W + PAD
      STRIP_H = PAD + FRAME_H + PAD/2 + FRAME_H + PAD + FOOTER
    } else {
      STRIP_W = FRAME_W + PAD * 2
      STRIP_H = PAD + (FRAME_H + PAD) * layout + FOOTER
    }

    const canvas = document.createElement('canvas')
    canvas.width = STRIP_W; canvas.height = STRIP_H
    const ctx = canvas.getContext('2d')

    // background
    ctx.fillStyle = t.bg
    ctx.fillRect(0, 0, STRIP_W, STRIP_H)

    // ── artist photo — small corner thumbnails, very subtle ──
    if (t.imgData) {
      try {
        const themeImg = await loadImage(t.imgData)

        // bottom-right corner — small, 25% of strip width
        const thumbW = Math.round(STRIP_W * 0.25)
        const ratio  = themeImg.naturalHeight / themeImg.naturalWidth
        const thumbH = Math.round(thumbW * ratio)
        const tx = STRIP_W - thumbW - 8
        const ty = STRIP_H - FOOTER - thumbH - 8

        ctx.save()
        ctx.globalAlpha = 0.2  // very subtle so strip design shows clearly
        ctx.drawImage(themeImg, tx, ty, thumbW, thumbH)
        ctx.globalAlpha = 1
        ctx.restore()

        // top-left corner — even smaller, 15% width
        const smallW = Math.round(STRIP_W * 0.15)
        const smallH = Math.round(smallW * ratio)
        ctx.save()
        ctx.globalAlpha = 0.15
        ctx.drawImage(themeImg, 8, 8, smallW, smallH)
        ctx.globalAlpha = 1
        ctx.restore()
      } catch(e) { console.log('theme image failed:', e) }
    }

    // outer border (thick)
    ctx.strokeStyle = t.border
    ctx.lineWidth   = 3
    ctx.strokeRect(3, 3, STRIP_W - 6, STRIP_H - 6)

    // inner border (dashed)
    ctx.strokeStyle = t.border
    ctx.lineWidth   = 1
    ctx.setLineDash([5, 4])
    ctx.strokeRect(9, 9, STRIP_W - 18, STRIP_H - 18)
    ctx.setLineDash([])

    // load images
    const images = await Promise.all(
      shots.slice(0, layout).map(shot => loadImage(shot.dataUrl))
    )

    function drawCover(ctx, img, x, y, w, h) {
      const ir = img.naturalWidth / img.naturalHeight, fr = w / h
      let sx, sy, sw, sh
      if (ir > fr) { sh = img.naturalHeight; sw = sh*fr; sx = (img.naturalWidth-sw)/2; sy = 0 }
      else { sw = img.naturalWidth; sh = sw/fr; sx = 0; sy = (img.naturalHeight-sh)/2 }
      ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
    }

    if (isGrid) {
      const positions = [[PAD,PAD],[PAD+FRAME_W+PAD/2,PAD],[PAD,PAD+FRAME_H+PAD/2],[PAD+FRAME_W+PAD/2,PAD+FRAME_H+PAD/2]]
      for (let i = 0; i < 4; i++) {
        const img = images[i]; if (!img) continue
        const [x, y] = positions[i]
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, FRAME_W, FRAME_H); ctx.clip()
        ctx.fillStyle = '#2c1f2e'; ctx.fillRect(x, y, FRAME_W, FRAME_H)
        ctx.filter = 'none'; drawCover(ctx, img, x, y, FRAME_W, FRAME_H)
        ctx.restore()
        ctx.strokeStyle = t.frameBorder; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, FRAME_W, FRAME_H)
      }
    } else {
      for (let i = 0; i < layout; i++) {
        const img = images[i]; if (!img) continue
        const x = PAD, y = PAD + i * (FRAME_H + PAD)
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, FRAME_W, FRAME_H); ctx.clip()
        ctx.fillStyle = '#2c1f2e'; ctx.fillRect(x, y, FRAME_W, FRAME_H)
        ctx.filter = 'none'; drawCover(ctx, img, x, y, FRAME_W, FRAME_H)
        ctx.restore()
        ctx.strokeStyle = t.frameBorder; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, FRAME_W, FRAME_H)
      }
    }

    // footer
    const footerY = STRIP_H - FOOTER + 20
    ctx.fillStyle = t.footerColor
    ctx.font      = 'italic bold 15px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText(t.footerText, STRIP_W/2, footerY)
    const date = new Date().toLocaleDateString('en-PH', { month:'long', day:'numeric', year:'numeric', timeZone:'Asia/Manila' })
    ctx.fillStyle = t.dateColor; ctx.font = '11px sans-serif'
    ctx.fillText(date, STRIP_W/2, footerY + 18)

    return canvas.toDataURL('image/jpeg', 0.93)
  }

  function loadImage(src) {
    return new Promise((res, rej) => {
      const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = src
    })
  }

  async function handleGenerateStrip() {
    const url = await generateStrip(); setStripUrl(url); setStep('strip')
  }

  function downloadStrip() {
    const a = document.createElement('a')
    a.href = stripUrl; a.download = `deidree_booth_${Date.now()}.jpg`; a.click()
  }

  function dataURLtoBlob(dataUrl) {
    const [header, base64] = dataUrl.split(',')
    const mime = header.match(/:(.*?);/)[1]
    const binary = atob(base64); const arr = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
    return new Blob([arr], { type: mime })
  }

  async function saveStrip() {
    setUploading(true)
    try {
      const blob = dataURLtoBlob(stripUrl)
      const compressed = await imageCompression(blob, { maxSizeMB:0.6, maxWidthOrHeight:1400, useWebWorker:true, fileType:'image/jpeg', initialQuality:0.85 })
      const path = `strip_${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage.from('photos').upload(path, compressed, { contentType:'image/jpeg' })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('photos').getPublicUrl(path)
      const { data: { user } } = await supabase.auth.getUser()
      const uploadedAt = new Date().toISOString()
      await supabase.from('photos').insert({ url:data.publicUrl, caption:caption||null, uploaded_by:user.id, created_at:uploadedAt })
      try {
        await fetch('/api/notify', { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ photoUrl:data.publicUrl, caption:caption||`${currentTheme.emoji} ${currentTheme.label} strip 🎞`, uploadedAt }) })
      } catch { console.log('Telegram failed') }
      setSaved(true)
    } catch (e) { alert('Save failed: ' + e.message) }
    setUploading(false)
  }

  function resetAll() {
    setStep('layout'); setShots([]); setCurrent(0); setStripUrl(null)
    setCaption(''); setSaved(false); setFilter('normal'); setProcessing(false)
    setLayoutGrid(false); setStickerMode(false)
  }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)) }
  async function handleLogout() { await supabase.auth.signOut(); router.push('/login') }

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      {flashing && <div style={s.flash} />}
      <div ref={overlayRef} style={{ position:'fixed', inset:0, background:'#fff', opacity:0, zIndex:9998, pointerEvents:'none', transition:'opacity 0.05s' }} />

      <div style={s.header}>
        <div>
          <h1 style={s.logo}>📷 Deidree's Booth</h1>
          <p style={s.logoSub}>your photos, our memories ♡</p>
        </div>
        <button style={s.logout} onClick={handleLogout}>Sign out</button>
      </div>

      {/* ── LAYOUT + THEME PICKER ── */}
      {step === 'layout' && (
        <div style={s.center}>
          <h2 style={s.stepTitle}>Choose Your Layout</h2>
          <p style={s.stepSub}>How many poses? 🌸</p>

          <div style={s.layoutGrid}>
            {LAYOUTS.map(l => (
              <div key={l.id}
                style={{ ...s.layoutCard, ...(layoutGrid ? (l.grid ? s.layoutCardActive : {}) : (layout === l.count && !l.grid ? s.layoutCardActive : {})) }}
                onClick={() => { setLayout(l.count); setLayoutGrid(!!l.grid) }}
              >
                <div style={s.layoutPreview}>
                  {l.grid
                    ? <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'3px', width:'44px' }}>
                        {[0,1,2,3].map(i => <div key={i} style={{ background:'rgba(244,167,185,0.3)', height:'18px', borderRadius:'2px' }} />)}
                      </div>
                    : [...Array(l.count)].map((_, i) => <div key={i} style={s.layoutFrameItem} />)
                  }
                </div>
                <p style={s.layoutLabel}>{l.label}</p>
              </div>
            ))}
          </div>

          {/* Theme picker */}
          <p style={s.sectionLabel}>🎨 Choose Strip Theme</p>
          <div style={s.themeGrid}>
            {THEMES.map(t => (
              <div key={t.id}
                style={{
                  ...s.themeCard,
                  background: t.bg,
                  border: theme === t.id ? `2.5px solid ${t.border}` : `1.5px solid ${t.border}40`,
                  boxShadow: theme === t.id ? `0 0 14px ${t.border}60` : 'none',
                }}
                onClick={() => setTheme(t.id)}
              >
                <span style={{ fontSize:'20px' }}>{t.emoji}</span>
                <p style={{ fontSize:'10px', fontWeight:'500', color: t.textOnLight ? '#333' : '#fff', fontFamily:"'DM Sans', sans-serif", marginTop:3, textAlign:'center' }}>{t.label}</p>
              </div>
            ))}
          </div>

          <button style={s.btnPink} onClick={() => { setCurrent(0); setShots([]); setStep('camera') }}>
            Next →
          </button>
        </div>
      )}

      {/* ── CAMERA ── */}
      {step === 'camera' && (
        <div style={s.center}>
          <div style={s.camHeader}>
            <div>
              <h2 style={s.stepTitle}>Pose! 📸</h2>
              <p style={s.stepSub}>Shot {current + 1} of {layout} · {currentTheme.emoji} {currentTheme.label}</p>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button
                style={{ ...s.iconBtn, background: flashOn ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.08)', border: flashOn ? '1.5px solid #ffd700' : '1.5px solid rgba(244,167,185,0.25)', color: flashOn ? '#ffd700' : '#f4a7b9' }}
                onClick={() => setFlashOn(f => !f)}
              >⚡</button>
              <button style={s.iconBtn} onClick={switchCamera} disabled={countdown !== null}>🔄</button>
            </div>
          </div>

          <div style={s.camWrap}>
            <video
              ref={videoRef}
              style={{
                ...s.video,
                filter: currentFilter?.id === 'normal' ? 'none' : currentFilter?.css,
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)',
              }}
              playsInline autoPlay muted
            />
            {countdown !== null && <div style={s.countdown}>{countdown}</div>}
          </div>
          <canvas ref={canvasRef} style={{ display:'none' }} />

          <div style={s.filterTabs}>
            <button style={{ ...s.filterTabBtn, ...(filterTab==='normal'?s.filterTabActive:{}) }} onClick={() => setFilterTab('normal')}>🎨 Filters</button>
            <button style={{ ...s.filterTabBtn, ...(filterTab==='beauty'?s.filterTabActive:{}) }} onClick={() => setFilterTab('beauty')}>✨ Beauty</button>
          </div>
          <div style={s.filterRow}>
            {currentFilters.map(f => (
              <button key={f.id}
                style={{ ...s.filterBtn, ...(filter===f.id?s.filterBtnActive:{}) }}
                onClick={() => setFilter(f.id)}
              >{f.label}</button>
            ))}
          </div>

          <div style={s.shotProgress}>
            {[...Array(layout)].map((_, i) => (
              <div key={i} style={{ ...s.shotThumb, ...(i===current?s.shotThumbActive:{}), ...(shots[i]?s.shotThumbDone:{}) }}>
                {shots[i]
                  ? <img src={shots[i].dataUrl} style={s.shotThumbImg} alt="" />
                  : <span style={{ color:i===current?'#e879a0':'#6b5070', fontSize:13 }}>{i+1}</span>
                }
              </div>
            ))}
          </div>

          <button
            style={{ ...s.btnPink, opacity:(countdown!==null||processing)?0.7:1 }}
            onClick={handleCaptureSimple}
            disabled={countdown!==null||processing}
          >
            {countdown!==null ? `${countdown}` : processing ? 'Processing...' : '📸 Capture!'}
          </button>
        </div>
      )}

      {/* ── REVIEW — normal ── */}
      {step === 'review' && !stickerMode && (
        <div style={s.center}>
          <h2 style={s.stepTitle}>Review Your Shots</h2>
          <p style={s.stepSub}>Tap 🎨 to add stickers! 🌸</p>

          {/* theme switcher on review too */}
          <div style={s.themeGrid}>
            {THEMES.map(t => (
              <div key={t.id}
                style={{
                  ...s.themeCard,
                  background: t.bg,
                  border: theme === t.id ? `2.5px solid ${t.border}` : `1.5px solid ${t.border}40`,
                  boxShadow: theme === t.id ? `0 0 14px ${t.border}60` : 'none',
                }}
                onClick={() => setTheme(t.id)}
              >
                <span style={{ fontSize:'18px' }}>{t.emoji}</span>
                <p style={{ fontSize:'9px', fontWeight:'500', color: t.textOnLight ? '#333' : '#fff', fontFamily:"'DM Sans', sans-serif", marginTop:2, textAlign:'center' }}>{t.label}</p>
              </div>
            ))}
          </div>

          <div style={s.reviewGrid}>
            {shots.map((shot, i) => (
              <div key={i} style={s.reviewFrame}>
                <img src={shot.dataUrl} style={s.reviewImg} alt={`shot ${i+1}`} />
                <p style={s.reviewLabel}>Shot {i + 1}</p>
                <div style={{ display:'flex' }}>
                  <button style={{ ...s.retakeBtn, flex:1, borderRight:'1px solid rgba(0,0,0,0.15)' }} onClick={() => retakeShot(i)}>🔄 Retake</button>
                  <button style={{ ...s.retakeBtn, flex:1, background:'rgba(150,80,220,0.85)' }} onClick={() => openStickers(i)}>🎨 Stickers</button>
                </div>
              </div>
            ))}
          </div>

          <input style={s.captionInput} placeholder="Add a caption (optional) ♡" value={caption} onChange={e => setCaption(e.target.value)} />
          <div style={s.btnRow}>
            <button style={s.btnOutline} onClick={resetAll}>Start Over</button>
            <button style={s.btnPink} onClick={handleGenerateStrip}>🎞 Generate Strip!</button>
          </div>
        </div>
      )}

      {/* ── REVIEW — sticker editor ── */}
      {step === 'review' && stickerMode && (
        <StickerCanvas
          photoUrl={shots[stickerShotIdx]?.dataUrl}
          onDone={onStickerDone}
          onCancel={() => setStickerMode(false)}
        />
      )}

      {/* ── STRIP ── */}
      {step === 'strip' && (
        <div style={s.center}>
          <h2 style={s.stepTitle}>Your Photo Strip! 🎉</h2>
          <p style={s.stepSub}>Save it, download it, love it ♡</p>
          {stripUrl && <img src={stripUrl} style={s.stripPreview} alt="photo strip" />}
          {saved && <p style={s.successMsg}>✨ Saved to our album! He can see it now 💕</p>}
          <div style={s.btnRow}>
            <button style={s.btnOutline} onClick={resetAll}>New Strip</button>
            <button style={s.btnOutline} onClick={downloadStrip}>⬇️ Download</button>
            {!saved && (
              <button style={{ ...s.btnPink, opacity:uploading?0.7:1 }} onClick={saveStrip} disabled={uploading}>
                {uploading ? 'Saving...' : '💾 Save to Album'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page: { minHeight:'100vh', background:'linear-gradient(135deg, #1a0f1e 0%, #2c1f2e 60%, #1a1530 100%)', paddingBottom:'80px' },
  flash: { position:'fixed', inset:0, background:'#fff', opacity:0.85, zIndex:9999, pointerEvents:'none' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid rgba(244,167,185,0.15)', background:'rgba(0,0,0,0.3)', backdropFilter:'blur(8px)', position:'sticky', top:0, zIndex:10 },
  logo: { fontFamily:"'Playfair Display', serif", fontSize:'20px', color:'#fdf0f5' },
  logoSub: { fontSize:'11px', color:'#9b8fa0', marginTop:2 },
  logout: { background:'none', border:'1px solid rgba(244,167,185,0.3)', borderRadius:'10px', padding:'8px 14px', color:'#f4a7b9', cursor:'pointer', fontSize:'13px', fontFamily:"'DM Sans', sans-serif", WebkitTapHighlightColor:'transparent' },
  center: { display:'flex', flexDirection:'column', alignItems:'center', padding:'24px 16px', gap:'16px', maxWidth:'600px', margin:'0 auto' },
  stepTitle: { fontFamily:"'Playfair Display', serif", fontSize:'24px', color:'#fdf0f5', textAlign:'center' },
  stepSub: { fontSize:'13px', color:'#9b8fa0', textAlign:'center', marginTop:'-8px' },
  sectionLabel: { alignSelf:'flex-start', fontSize:'13px', color:'rgba(244,167,185,0.7)', fontFamily:"'DM Sans', sans-serif", fontWeight:'500' },
  layoutGrid: { display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:'10px', width:'100%' },
  layoutCard: { background:'rgba(255,255,255,0.05)', border:'1.5px solid rgba(244,167,185,0.15)', borderRadius:'14px', padding:'12px 6px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', WebkitTapHighlightColor:'transparent' },
  layoutCardActive: { border:'1.5px solid #e879a0', background:'rgba(232,121,160,0.12)', boxShadow:'0 0 16px rgba(232,121,160,0.2)' },
  layoutPreview: { display:'flex', flexDirection:'column', gap:'4px', width:'44px', minHeight:'72px', justifyContent:'center', alignItems:'center' },
  layoutFrameItem: { width:'100%', height:'16px', borderRadius:'2px', background:'rgba(244,167,185,0.25)', border:'1px solid rgba(244,167,185,0.2)' },
  layoutLabel: { color:'#fdf0f5', fontSize:'11px', fontWeight:'500', fontFamily:"'DM Sans', sans-serif", textAlign:'center' },
  themeGrid: { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'8px', width:'100%' },
  themeCard: { borderRadius:'12px', padding:'10px 6px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'3px', transition:'all 0.2s', WebkitTapHighlightColor:'transparent', minHeight:'64px', justifyContent:'center' },
  camHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', gap:'12px' },
  iconBtn: { background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(244,167,185,0.25)', borderRadius:'12px', padding:'10px 14px', color:'#f4a7b9', cursor:'pointer', fontSize:'16px', WebkitTapHighlightColor:'transparent', touchAction:'manipulation' },
  camWrap: { width:'100%', maxWidth:'480px', aspectRatio:'4/3', borderRadius:'20px', overflow:'hidden', position:'relative', background:'#0f0a14', border:'2px solid rgba(244,167,185,0.2)' },
  video: { width:'100%', height:'100%', objectFit:'cover', display:'block', transition:'filter 0.2s' },
  countdown: { position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'100px', color:'#fff', textShadow:'0 2px 24px rgba(0,0,0,0.6)', background:'rgba(0,0,0,0.3)', fontFamily:"'Playfair Display', serif", pointerEvents:'none' },
  filterTabs: { display:'flex', gap:'8px', width:'100%' },
  filterTabBtn: { flex:1, padding:'9px', borderRadius:'10px', border:'1.5px solid rgba(244,167,185,0.15)', background:'rgba(255,255,255,0.05)', color:'#9b8fa0', cursor:'pointer', fontSize:'13px', fontFamily:"'DM Sans', sans-serif", WebkitTapHighlightColor:'transparent' },
  filterTabActive: { background:'rgba(232,121,160,0.15)', border:'1.5px solid #e879a0', color:'#f4a7b9', fontWeight:'500' },
  filterRow: { display:'flex', gap:'8px', overflowX:'auto', width:'100%', paddingBottom:'4px', scrollbarWidth:'none', WebkitOverflowScrolling:'touch' },
  filterBtn: { background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(244,167,185,0.15)', borderRadius:'20px', padding:'7px 13px', color:'#9b8fa0', cursor:'pointer', fontSize:'12px', fontFamily:"'DM Sans', sans-serif", WebkitTapHighlightColor:'transparent', touchAction:'manipulation', whiteSpace:'nowrap', flexShrink:0 },
  filterBtnActive: { background:'linear-gradient(135deg, #f4a7b9, #e879a0)', border:'1.5px solid transparent', color:'#fff', fontWeight:'500' },
  shotProgress: { display:'flex', gap:'10px', justifyContent:'center' },
  shotThumb: { width:'52px', height:'52px', borderRadius:'10px', border:'2px solid rgba(244,167,185,0.2)', background:'#2c1f2e', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' },
  shotThumbActive: { border:'2px solid #e879a0', boxShadow:'0 0 12px rgba(232,121,160,0.4)' },
  shotThumbDone: { border:'2px solid rgba(244,167,185,0.5)' },
  shotThumbImg: { width:'100%', height:'100%', objectFit:'cover' },
  reviewGrid: { display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'12px', width:'100%' },
  reviewFrame: { borderRadius:'14px', overflow:'hidden', background:'#2c1f2e', border:'1px solid rgba(244,167,185,0.15)', display:'flex', flexDirection:'column' },
  reviewImg: { width:'100%', aspectRatio:'4/3', objectFit:'cover', display:'block' },
  retakeBtn: { flex:1, background:'rgba(232,121,160,0.85)', color:'#fff', border:'none', padding:'9px 8px', fontSize:'12px', fontFamily:"'DM Sans', sans-serif", cursor:'pointer', fontWeight:'500', WebkitTapHighlightColor:'transparent', touchAction:'manipulation' },
  reviewLabel: { textAlign:'center', color:'rgba(255,255,255,0.5)', fontSize:'11px', fontFamily:"'DM Sans', sans-serif", padding:'4px 0', background:'#1a0f1e' },
  stripPreview: { width:'100%', maxWidth:'340px', height:'auto', borderRadius:'16px', boxShadow:'0 8px 40px rgba(0,0,0,0.5)', border:'1px solid rgba(244,167,185,0.2)' },
  captionInput: { padding:'14px 16px', borderRadius:'12px', border:'1.5px solid rgba(244,167,185,0.2)', fontSize:'16px', fontFamily:"'DM Sans', sans-serif", outline:'none', background:'rgba(255,255,255,0.06)', color:'#fff', width:'100%' },
  btnRow: { display:'flex', gap:'10px', width:'100%', flexWrap:'wrap' },
  btnPink: { flex:1, background:'linear-gradient(135deg, #f4a7b9, #e879a0)', color:'#fff', border:'none', borderRadius:'14px', padding:'16px 12px', fontSize:'15px', fontFamily:"'DM Sans', sans-serif", fontWeight:'500', cursor:'pointer', WebkitTapHighlightColor:'transparent', touchAction:'manipulation', boxShadow:'0 4px 16px rgba(232,121,160,0.3)' },
  btnOutline: { flex:1, background:'none', color:'#f4a7b9', border:'1.5px solid rgba(244,167,185,0.3)', borderRadius:'14px', padding:'16px 12px', fontSize:'15px', fontFamily:"'DM Sans', sans-serif", cursor:'pointer', WebkitTapHighlightColor:'transparent', touchAction:'manipulation' },
  successMsg: { textAlign:'center', color:'#e879a0', background:'rgba(232,121,160,0.1)', padding:'14px', borderRadius:'12px', fontSize:'14px', fontWeight:'500', border:'1px solid rgba(232,121,160,0.2)', width:'100%' },
}
