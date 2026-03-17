'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import imageCompression from 'browser-image-compression'

// ── Filters ───────────────────────────────────────────────────
const FILTERS = [
  { id: 'normal',  label: '✨ Normal',  css: 'none', matrix: null },
  { id: 'soft',    label: '🌸 Soft',
    css: 'brightness(1.15) saturate(0.7) contrast(0.85)',
    matrix: [1.0,0,0,0,0.08, 0,0.9,0,0,0.06, 0,0,0.9,0,0.06, 0,0,0,1,0] },
  { id: 'warm',    label: '🌅 Warm',
    css: 'sepia(0.6) saturate(1.8) brightness(1.1)',
    matrix: [1.4,0.2,0,0,0.08, 0.1,1.0,0,0,0.03, 0,0,0.5,0,-0.1, 0,0,0,1,0] },
  { id: 'pink',    label: '🩷 Pink',
    css: 'sepia(0.2) saturate(2.5) hue-rotate(300deg) brightness(1.1)',
    matrix: [1.5,0,0.3,0,0.05, 0,0.7,0.1,0,0, 0.2,0,0.8,0,0.05, 0,0,0,1,0] },
  { id: 'vintage', label: '📷 Vintage',
    css: 'sepia(0.8) contrast(1.2) brightness(0.9)',
    matrix: [1.0,0.3,0.1,0,0, 0.1,0.8,0.1,0,0, 0.05,0.15,0.45,0,0, 0,0,0,1,0] },
  { id: 'retro',   label: '🎞 Retro',
    css: 'sepia(0.5) hue-rotate(20deg) saturate(2) contrast(1.2)',
    matrix: [1.3,0.2,0,0,0.05, 0.1,1.0,0.1,0,0, 0,0.1,0.5,0,-0.1, 0,0,0,1,0] },
  { id: 'bw',      label: '🖤 B&W',
    css: 'grayscale(1) contrast(1.3) brightness(1.05)',
    matrix: [0.299,0.587,0.114,0,0, 0.299,0.587,0.114,0,0, 0.299,0.587,0.114,0,0, 0,0,0,1,0] },
  { id: 'dramatic',label: '🎭 Drama',
    css: 'contrast(1.6) brightness(0.8) saturate(1.4)',
    matrix: [1.2,0,0,0,-0.15, 0,1.2,0,0,-0.15, 0,0,1.2,0,-0.15, 0,0,0,1,0] },
  { id: 'lomo',    label: '🔴 Lomo',
    css: 'saturate(2.5) contrast(1.4) brightness(0.85)',
    matrix: [1.6,0,0,0,-0.15, 0,1.3,0,0,-0.15, 0,0,0.7,0,-0.1, 0,0,0,1,0] },
  { id: 'cold',    label: '🧊 Cold',
    css: 'saturate(0.6) hue-rotate(200deg) brightness(1.15)',
    matrix: [0.6,0,0.3,0,0.05, 0,0.7,0.2,0,0.05, 0.1,0.1,1.4,0,0.05, 0,0,0,1,0] },
  { id: 'golden',  label: '✨ Golden',
    css: 'sepia(0.6) saturate(2) brightness(1.15) hue-rotate(340deg)',
    matrix: [1.5,0.2,0,0,0.1, 0.1,1.1,0,0,0.05, 0,0,0.4,0,-0.1, 0,0,0,1,0] },
  { id: 'dreamy',  label: '💫 Dreamy',
    css: 'brightness(1.2) saturate(0.5) contrast(0.75)',
    matrix: [0.85,0,0,0,0.15, 0,0.85,0,0,0.12, 0,0,0.85,0,0.15, 0,0,0,1,0] },
]

// ── Layouts ───────────────────────────────────────────────────
const LAYOUTS = [
  { id: 1, label: '1 Pose',  count: 1 },
  { id: 2, label: '2 Poses', count: 2 },
  { id: 3, label: '3 Poses', count: 3 },
  { id: 4, label: '4 Poses', count: 4 },
]

// ── Strip Themes ──────────────────────────────────────────────
const THEMES = [
  {
    id: 'dark',
    label: 'Classic',
    emoji: '🖤',
    bg: '#1a0f1e',
    border: 'rgba(244,167,185,0.5)',
    frameBorder: 'rgba(244,167,185,0.3)',
    footerColor: 'rgba(244,167,185,0.85)',
    footerText: "Deidree's Album ♡",
    dateColor: 'rgba(255,255,255,0.35)',
    decorations: [],
  },
  {
    id: 'deidree',
    label: 'Deidree',
    emoji: '🎀',
    bg: '#2d0a1e',
    border: '#ff69b4',
    frameBorder: '#ff69b4',
    footerColor: '#ff69b4',
    footerText: '🎀 Deidree 🎀',
    dateColor: 'rgba(255,182,193,0.7)',
    decorations: [
      { text: '♡', x: 0.05, y: 0.04, size: 22, color: '#ff69b4' },
      { text: '♡', x: 0.92, y: 0.04, size: 22, color: '#ff69b4' },
      { text: '✦', x: 0.1,  y: 0.96, size: 16, color: '#ffb6c1' },
      { text: '✦', x: 0.88, y: 0.96, size: 16, color: '#ffb6c1' },
      { text: '🎀', x: 0.5, y: 0.02, size: 20, color: '#fff' },
    ],
  },
  {
    id: 'olivia',
    label: 'Olivia R.',
    emoji: '💜',
    themePhoto: '/themes/olivia.jpg',
    headerText: '★ SOUR ★ brutal ★ good 4 u ★',
    bg: '#0d0010',
    border: '#9b59b6',
    frameBorder: '#6c3483',
    footerColor: '#d98ef0',
    footerText: 'brutal ★ good 4 u ★ drivers license',
    dateColor: 'rgba(200,150,230,0.6)',
    decorations: [
      { text: '★', x: 0.05, y: 0.03, size: 20, color: '#9b59b6' },
      { text: '★', x: 0.92, y: 0.03, size: 20, color: '#9b59b6' },
      { text: '✦', x: 0.15, y: 0.97, size: 14, color: '#d98ef0' },
      { text: '✦', x: 0.85, y: 0.97, size: 14, color: '#d98ef0' },
      { text: '★', x: 0.5,  y: 0.015,size: 18, color: '#b97fd4' },
    ],
    sideText: 'SOUR',
    sideColor: '#9b59b6',
  },
  {
    id: 'ariana',
  label: 'Ariana G.',
  emoji: '🌙',
  themePhoto: '/themes/ariana.jpg',
  headerText: '✨ thank u, next ✨ positions ✨',
    bg: '#1a0020',
    border: '#ff1493',
    frameBorder: '#c71585',
    footerColor: '#ff69b4',
    footerText: '✨ thank u, next ✨',
    dateColor: 'rgba(255,182,193,0.6)',
    decorations: [
      { text: '✨', x: 0.04, y: 0.03, size: 18, color: '#ff69b4' },
      { text: '✨', x: 0.90, y: 0.03, size: 18, color: '#ff69b4' },
      { text: '♡', x: 0.12, y: 0.97, size: 20, color: '#ff1493' },
      { text: '♡', x: 0.88, y: 0.97, size: 20, color: '#ff1493' },
      { text: '🌙', x: 0.5,  y: 0.015,size: 18, color: '#fff' },
    ],
    sideText: 'AG',
    sideColor: '#ff1493',
  },
  {
    id: 'taylor',
  label: 'Taylor S.',
  emoji: '🌟',
  themePhoto: '/themes/taylor.jpg',
  headerText: '✦ speak now ✦ 1989 ✦ eras ✦',
    bg: '#0a0505',
    border: '#c9a84c',
    frameBorder: '#c9a84c',
    footerColor: '#f0d060',
    footerText: '✦ speak now ✦ 1989 ✦ eras tour ✦',
    dateColor: 'rgba(210,180,100,0.6)',
    decorations: [
      { text: '✦', x: 0.05, y: 0.03, size: 18, color: '#c9a84c' },
      { text: '✦', x: 0.92, y: 0.03, size: 18, color: '#c9a84c' },
      { text: '♡', x: 0.12, y: 0.97, size: 18, color: '#e8b04a' },
      { text: '♡', x: 0.88, y: 0.97, size: 18, color: '#e8b04a' },
      { text: '🌟', x: 0.5,  y: 0.015,size: 18, color: '#fff' },
    ],
    sideText: 'TS',
    sideColor: '#c9a84c',
  },
  {
    id: 'loudhouse',
    label: 'Loud House',
    emoji: '🏠',
    themePhoto: '/themes/loudhouse.jpg',
    headerText: '★ THE LOUD HOUSE ★',
    bg: '#ffffff',
    border: '#000000',
    frameBorder: '#000000',
    footerColor: '#e31c25',
    footerText: '★ THE LOUD HOUSE ★',
    dateColor: '#333',
    textOnLight: true,
    decorations: [
      { text: '★', x: 0.05, y: 0.03, size: 20, color: '#e31c25' },
      { text: '★', x: 0.92, y: 0.03, size: 20, color: '#e31c25' },
      { text: '★', x: 0.12, y: 0.97, size: 16, color: '#000' },
      { text: '★', x: 0.88, y: 0.97, size: 16, color: '#000' },
      { text: '🏠', x: 0.5,  y: 0.015,size: 18, color: '#000' },
    ],
    sideText: 'LH',
    sideColor: '#e31c25',
  },
  {
    id: 'pink',
    label: 'Pink Cute',
    emoji: '🌸',
    bg: '#fff0f5',
    border: '#ff9dbb',
    frameBorder: '#ffb6cb',
    footerColor: '#e8698a',
    footerText: '🌸 cute & pretty 🌸',
    dateColor: 'rgba(200,80,120,0.5)',
    textOnLight: true,
    decorations: [
      { text: '🌸', x: 0.04, y: 0.03, size: 18, color: '#ff9dbb' },
      { text: '🌸', x: 0.90, y: 0.03, size: 18, color: '#ff9dbb' },
      { text: '♡', x: 0.12, y: 0.97, size: 20, color: '#ff9dbb' },
      { text: '♡', x: 0.88, y: 0.97, size: 20, color: '#ff9dbb' },
      { text: '✿', x: 0.5,  y: 0.015,size: 18, color: '#ffb6cb' },
    ],
  },
  {
    id: 'girly',
    label: 'Just 4 Girls',
    emoji: '👑',
    bg: '#fff5ee',
    border: '#e8a0bf',
    frameBorder: '#e8a0bf',
    footerColor: '#c06090',
    footerText: '👑 just a girl thing 👑',
    dateColor: 'rgba(180,80,120,0.5)',
    textOnLight: true,
    decorations: [
      { text: '👑', x: 0.04, y: 0.025,size: 18, color: '#e8a0bf' },
      { text: '👑', x: 0.90, y: 0.025,size: 18, color: '#e8a0bf' },
      { text: '✦', x: 0.12, y: 0.97, size: 16, color: '#e8a0bf' },
      { text: '✦', x: 0.88, y: 0.97, size: 16, color: '#e8a0bf' },
      { text: '♡', x: 0.5,  y: 0.015,size: 18, color: '#c06090' },
    ],
  },
  {
    id: 'aesthetic',
    label: 'Aesthetic',
    emoji: '🤍',
    bg: '#f5f5f0',
    border: '#bbb',
    frameBorder: '#ccc',
    footerColor: '#666',
    footerText: 'film . memories . us',
    dateColor: 'rgba(100,100,100,0.5)',
    textOnLight: true,
    decorations: [
      { text: '◦', x: 0.05, y: 0.03, size: 20, color: '#bbb' },
      { text: '◦', x: 0.92, y: 0.03, size: 20, color: '#bbb' },
      { text: '◦', x: 0.12, y: 0.97, size: 16, color: '#bbb' },
      { text: '◦', x: 0.88, y: 0.97, size: 16, color: '#bbb' },
    ],
  id: 'sabrina',
  label: 'Sabrina C.',
  emoji: '🌻',
  bg: '#0a1a2e',
  border: '#ffd700',
  frameBorder: '#ffd700',
  footerColor: '#ffd700',
  themePhoto: '/themes/sabrina.jpg',
  headerText: '🌻 Sabrina Carpenter 🌻',
  footerText: '☆ please please please ☆',
  dateColor: 'rgba(255,215,0,0.5)',
  decorations: [
    { text: '☆', x: 0.05, y: 0.03, size: 18, color: '#ffd700' },
    { text: '☆', x: 0.92, y: 0.03, size: 18, color: '#ffd700' },
  ],
},
]

// ── Filter pixel manipulation ─────────────────────────────────
function applyMatrixFilter(srcCanvas, matrix) {
  const W = srcCanvas.width
  const H = srcCanvas.height
  const out    = document.createElement('canvas')
  out.width    = W
  out.height   = H
  const ctx    = out.getContext('2d')
  const src    = srcCanvas.getContext('2d').getImageData(0, 0, W, H)
  const dst    = ctx.createImageData(W, H)
  const d = src.data, o = dst.data, m = matrix
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2], a = d[i+3]
    o[i]   = clamp(m[0]*r + m[1]*g + m[2]*b + m[3]*a + m[4]*255)
    o[i+1] = clamp(m[5]*r + m[6]*g + m[7]*b + m[8]*a + m[9]*255)
    o[i+2] = clamp(m[10]*r+m[11]*g +m[12]*b +m[13]*a +m[14]*255)
    o[i+3] = a
  }
  ctx.putImageData(dst, 0, 0)
  return out
}
function clamp(v) { return Math.min(255, Math.max(0, Math.round(v))) }

function captureFrame(videoEl, filterObj, mirror) {
  const W = videoEl.videoWidth  || 640
  const H = videoEl.videoHeight || 480
  const raw    = document.createElement('canvas')
  raw.width    = W
  raw.height   = H
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
      if (!data.session) {
        router.push('/login')
        return
      }
  
      // show welcome once per day
      const today = new Date().toDateString()
      const lastSeen = localStorage.getItem('welcome_last_seen')
  
      if (lastSeen !== today) {
        localStorage.setItem('welcome_last_seen', today)
        router.push('/welcome')
      }
    })
  }, [])

  const [step,       setStep]       = useState('layout')
  const [layout,     setLayout]     = useState(4)
  const [filter,     setFilter]     = useState('normal')
  const [theme,      setTheme]      = useState('dark')
  const [shots,      setShots]      = useState([])
  const [current,    setCurrent]    = useState(0)
  const [countdown,  setCountdown]  = useState(null)
  const [flashing,   setFlashing]   = useState(false)
  const [stripUrl,   setStripUrl]   = useState(null)
  const [caption,    setCaption]    = useState('')
  const [uploading,  setUploading]  = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [facingMode, setFacingMode] = useState('user')
  const [processing, setProcessing] = useState(false)

  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const currentFilter = FILTERS.find(f => f.id === filter)
  const currentTheme  = THEMES.find(t => t.id === theme)

  async function startCamera(facing) {
    const mode = facing ?? facingMode
    try {
      streamRef.current?.getTracks().forEach(t => t.stop())
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode } }, audio: false,
      })
      streamRef.current = stream
      const vid = videoRef.current
      vid.setAttribute('autoplay', ''); vid.setAttribute('muted', ''); vid.setAttribute('playsinline', '')
      vid.muted = true; vid.srcObject = stream
      await new Promise(r => setTimeout(r, 150))
      await vid.play()
    } catch (err) {
      if (err.name === 'NotAllowedError') alert('📷 Camera blocked!\n\niPhone: Settings → Safari → Camera → Allow!')
      else if (err.name === 'NotFoundError') alert('📷 No camera found!')
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

  const takeShot = useCallback(() => {
    const mirror  = facingMode === 'user'
    const dataUrl = captureFrame(videoRef.current, currentFilter, mirror)
    setFlashing(true); setTimeout(() => setFlashing(false), 200)
    return dataUrl
  }, [filter, currentFilter, facingMode])

  async function captureWithCountdown() {
    for (let c = 3; c >= 1; c--) { setCountdown(c); await wait(1000) }
    setCountdown('📸'); await wait(300)
    const dataUrl = takeShot(); setCountdown(null)
    return dataUrl
  }

  async function handleCapture() {
    if (processing) return
    setProcessing(true)
    const dataUrl  = await captureWithCountdown()
    const newShots = [...shots]
    newShots[current] = { dataUrl, filterId: filter }
    setShots(newShots)
    if (current + 1 < layout) setCurrent(current + 1)
    else setStep('review')
    setProcessing(false)
  }

  function retakeShot(idx) { setCurrent(idx); setStep('camera') }

  // ── Generate themed strip ─────────────────────────────────────
  async function generateStrip() {
    const t       = currentTheme
    const FRAME_W = 420
    const FRAME_H = 320
    const PAD     = 16
    const HEADER  = 80  // taller header for theme photo
    const FOOTER  = 80  // taller footer for theme photo
    const STRIP_W = FRAME_W + PAD * 2
    const STRIP_H = HEADER + PAD + (FRAME_H + PAD) * layout + FOOTER
  
    const canvas  = document.createElement('canvas')
    canvas.width  = STRIP_W
    canvas.height = STRIP_H
    const ctx     = canvas.getContext('2d')
  
    // background
    ctx.fillStyle = t.bg
    ctx.fillRect(0, 0, STRIP_W, STRIP_H)
  
    // ── Draw theme photo in header and footer ──
    if (t.themePhoto) {
      try {
        const themeImg = await loadImage(t.themePhoto)
  
        // header — full width strip, cropped to header height
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, STRIP_W, HEADER)
        ctx.clip()
        // draw cover-fit
        const hRatio = STRIP_W / themeImg.naturalWidth
        const hH     = themeImg.naturalHeight * hRatio
        const hOffY  = (HEADER - hH) / 2
        ctx.globalAlpha = 0.55
        ctx.drawImage(themeImg, 0, hOffY, STRIP_W, hH)
        ctx.globalAlpha = 1
        ctx.restore()
  
        // footer — same
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, STRIP_H - FOOTER, STRIP_W, FOOTER)
        ctx.clip()
        ctx.globalAlpha = 0.55
        ctx.drawImage(themeImg, 0, STRIP_H - FOOTER + hOffY, STRIP_W, hH)
        ctx.globalAlpha = 1
        ctx.restore()
  
      } catch { /* skip if image fails */ }
    }
  
    // overlay tint on header/footer so text is readable
    ctx.fillStyle = t.bg + 'cc'
    ctx.fillRect(0, 0, STRIP_W, HEADER)
    ctx.fillRect(0, STRIP_H - FOOTER, STRIP_W, FOOTER)
  
    // outer border
    ctx.strokeStyle = t.border
    ctx.lineWidth   = 4
    ctx.strokeRect(4, 4, STRIP_W - 8, STRIP_H - 8)
  
    // inner border
    ctx.strokeStyle = t.border
    ctx.lineWidth   = 1
    ctx.strokeRect(10, 10, STRIP_W - 20, STRIP_H - 20)
  
    // header text
    ctx.fillStyle = t.footerColor
    ctx.font      = 'bold italic 18px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText(t.headerText || t.footerText, STRIP_W / 2, HEADER / 2 + 6)
  
    // decorations
    for (const d of (t.decorations || [])) {
      ctx.fillStyle = d.color
      ctx.font      = `${d.size}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(d.text, d.x * STRIP_W, d.y * STRIP_H)
    }
  
    // load all shot images
    const images = await Promise.all(
      shots.slice(0, layout).map(shot => loadImage(shot.dataUrl))
    )
  
    function drawCover(ctx, img, x, y, w, h) {
      const imgRatio = img.naturalWidth / img.naturalHeight
      const frmRatio = w / h
      let sx, sy, sw, sh
      if (imgRatio > frmRatio) {
        sh = img.naturalHeight; sw = sh * frmRatio
        sx = (img.naturalWidth - sw) / 2; sy = 0
      } else {
        sw = img.naturalWidth; sh = sw / frmRatio
        sx = 0; sy = (img.naturalHeight - sh) / 2
      }
      ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
    }
  
    // draw frames
    for (let i = 0; i < layout; i++) {
      const img = images[i]
      if (!img) continue
      const x = PAD
      const y = HEADER + PAD + i * (FRAME_H + PAD)
  
      ctx.save()
      ctx.beginPath()
      ctx.rect(x, y, FRAME_W, FRAME_H)
      ctx.clip()
      ctx.fillStyle = '#2c1f2e'
      ctx.fillRect(x, y, FRAME_W, FRAME_H)
      ctx.filter = 'none'
      drawCover(ctx, img, x, y, FRAME_W, FRAME_H)
      ctx.restore()
  
      ctx.strokeStyle = t.frameBorder
      ctx.lineWidth   = 2
      ctx.strokeRect(x, y, FRAME_W, FRAME_H)
    }
  
    // footer text
    const footerMid = STRIP_H - FOOTER + FOOTER / 2
    ctx.fillStyle = t.footerColor
    ctx.font      = 'italic bold 16px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText(t.footerText, STRIP_W / 2, footerMid)
  
    const date = new Date().toLocaleDateString('en-PH', {
      month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila',
    })
    ctx.fillStyle = t.dateColor
    ctx.font      = '12px sans-serif'
    ctx.fillText(date, STRIP_W / 2, footerMid + 20)
  
    return canvas.toDataURL('image/jpeg', 0.93)
  }

  function loadImage(src) {
    return new Promise((res, rej) => {
      const img = new Image()
      img.onload = () => res(img); img.onerror = rej; img.src = src
    })
  }

  async function handleGenerateStrip() {
    const url = await generateStrip()
    setStripUrl(url); setStep('strip')
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
      const compressed = await imageCompression(blob, {
        maxSizeMB: 0.6, maxWidthOrHeight: 1400,
        useWebWorker: true, fileType: 'image/jpeg', initialQuality: 0.85,
      })
      const path = `strip_${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage.from('photos').upload(path, compressed, { contentType: 'image/jpeg' })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('photos').getPublicUrl(path)
      const { data: { user } } = await supabase.auth.getUser()
      const uploadedAt = new Date().toISOString()
      await supabase.from('photos').insert({
        url: data.publicUrl, caption: caption || null,
        uploaded_by: user.id, created_at: uploadedAt,
      })
      try {
        await fetch('/api/notify', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photoUrl: data.publicUrl,
            caption: caption || `${currentTheme.emoji} ${currentTheme.label} strip — ${layout} poses 🎞`,
            uploadedAt,
          }),
        })
      } catch { console.log('Telegram failed') }
      setSaved(true)
    } catch (e) { alert('Save failed: ' + e.message) }
    setUploading(false)
  }

  function resetAll() {
    setStep('layout'); setShots([]); setCurrent(0)
    setStripUrl(null); setCaption(''); setSaved(false)
    setFilter('normal'); setProcessing(false)
  }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)) }
  async function handleLogout() { await supabase.auth.signOut(); router.push('/login') }

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      {flashing && <div style={s.flash} />}

      <div style={s.header}>
        <div>
          <h1 style={s.logo}>📷 Deidree's Booth</h1>
          <p style={s.logoSub}>your photos, our memories ♡</p>
        </div>
        <button style={s.logout} onClick={handleLogout}>Sign out</button>
      </div>

      {/* ── LAYOUT ── */}
      {step === 'layout' && (
        <div style={s.center}>
          <h2 style={s.stepTitle}>Choose Your Layout</h2>
          <p style={s.stepSub}>How many poses? 🌸</p>
          <div style={s.layoutGrid}>
            {LAYOUTS.map(l => (
              <div key={l.id}
                style={{ ...s.layoutCard, ...(layout === l.id ? s.layoutCardActive : {}) }}
                onClick={() => setLayout(l.id)}
              >
                <div style={s.layoutPreview}>
                  {[...Array(l.count)].map((_, i) => <div key={i} style={s.layoutFrame} />)}
                </div>
                <p style={s.layoutLabel}>{l.label}</p>
                <p style={s.layoutSub}>4×6</p>
              </div>
            ))}
          </div>

          {/* Theme picker */}
          <h3 style={s.themeTitle}>Choose Strip Theme</h3>
          <div style={s.themeGrid}>
            {THEMES.map(t => (
              <div key={t.id}
                style={{
                  ...s.themeCard,
                  background: t.bg,
                  border: theme === t.id ? `3px solid ${t.border}` : `2px solid ${t.border}40`,
                  boxShadow: theme === t.id ? `0 0 16px ${t.border}60` : 'none',
                }}
                onClick={() => setTheme(t.id)}
              >
                <span style={{ fontSize: 20 }}>{t.emoji}</span>
                <p style={{
                  fontSize: '11px', fontWeight: '500',
                  color: t.textOnLight ? '#333' : '#fff',
                  fontFamily: "'DM Sans', sans-serif",
                  marginTop: 4, textAlign: 'center',
                }}>{t.label}</p>
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
              <h2 style={s.stepTitle}>Get Ready to Pose!</h2>
              <p style={s.stepSub}>Shot {current + 1} of {layout} 📸</p>
            </div>
            <button style={s.switchCamBtn} onClick={switchCamera} disabled={countdown !== null}>🔄 Flip</button>
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
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <div style={s.filterRow}>
            {FILTERS.map(f => (
              <button key={f.id}
                style={{ ...s.filterBtn, ...(filter === f.id ? s.filterBtnActive : {}) }}
                onClick={() => setFilter(f.id)}
              >{f.label}</button>
            ))}
          </div>

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

          <button
            style={{ ...s.btnPink, opacity: (countdown !== null || processing) ? 0.7 : 1 }}
            onClick={handleCapture}
            disabled={countdown !== null || processing}
          >
            {countdown !== null ? `${countdown}` : processing ? 'Processing...' : '📸 Capture!'}
          </button>
        </div>
      )}

      {/* ── REVIEW ── */}
      {step === 'review' && (
        <div style={s.center}>
          <h2 style={s.stepTitle}>Review Your Shots</h2>
          <p style={s.stepSub}>Happy? Or retake some? 🌸</p>

          <div style={s.reviewGrid}>
            {shots.map((shot, i) => (
              <div key={i} style={s.reviewFrame}>
                <img src={shot.dataUrl} style={s.reviewImg} alt={`shot ${i+1}`} />
                <p style={s.reviewLabel}>Shot {i + 1}</p>
                <button style={s.retakeBtn} onClick={() => retakeShot(i)}>🔄 Retake</button>
              </div>
            ))}
          </div>

          {/* theme switcher on review too */}
          <p style={{ color: '#9b8fa0', fontSize: '13px', marginTop: 4 }}>Change strip theme:</p>
          <div style={s.themeGrid}>
            {THEMES.map(t => (
              <div key={t.id}
                style={{
                  ...s.themeCard,
                  background: t.bg,
                  border: theme === t.id ? `3px solid ${t.border}` : `2px solid ${t.border}40`,
                  boxShadow: theme === t.id ? `0 0 16px ${t.border}60` : 'none',
                }}
                onClick={() => setTheme(t.id)}
              >
                <span style={{ fontSize: 20 }}>{t.emoji}</span>
                <p style={{
                  fontSize: '11px', fontWeight: '500',
                  color: t.textOnLight ? '#333' : '#fff',
                  fontFamily: "'DM Sans', sans-serif",
                  marginTop: 4, textAlign: 'center',
                }}>{t.label}</p>
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
            <button style={s.btnPink} onClick={handleGenerateStrip}>🎞 Generate Strip!</button>
          </div>
        </div>
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
              <button
                style={{ ...s.btnPink, opacity: uploading ? 0.7 : 1 }}
                onClick={saveStrip} disabled={uploading}
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

const s = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg, #1a0f1e 0%, #2c1f2e 60%, #1a1530 100%)', paddingBottom: '80px' },
  flash: { position: 'fixed', inset: 0, background: '#fff', opacity: 0.85, zIndex: 9999, pointerEvents: 'none' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(244,167,185,0.15)', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 10 },
  logo: { fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#fdf0f5' },
  logoSub: { fontSize: '11px', color: '#9b8fa0', marginTop: 2 },
  logout: { background: 'none', border: '1px solid rgba(244,167,185,0.3)', borderRadius: '10px', padding: '8px 14px', color: '#f4a7b9', cursor: 'pointer', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", WebkitTapHighlightColor: 'transparent' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 16px', gap: '16px', maxWidth: '600px', margin: '0 auto' },
  stepTitle: { fontFamily: "'Playfair Display', serif", fontSize: '24px', color: '#fdf0f5', textAlign: 'center' },
  stepSub: { fontSize: '14px', color: '#9b8fa0', textAlign: 'center', marginTop: '-8px' },
  themeTitle: { fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#fdf0f5', marginTop: '8px' },
  themeGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', width: '100%' },
  themeCard: { borderRadius: '12px', padding: '12px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'all 0.2s', WebkitTapHighlightColor: 'transparent', minHeight: '70px', justifyContent: 'center' },
  layoutGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', width: '100%' },
  layoutCard: { background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(244,167,185,0.15)', borderRadius: '16px', padding: '16px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', WebkitTapHighlightColor: 'transparent' },
  layoutCardActive: { border: '1.5px solid #e879a0', background: 'rgba(232,121,160,0.12)', boxShadow: '0 0 20px rgba(232,121,160,0.2)' },
  layoutPreview: { display: 'flex', flexDirection: 'column', gap: '5px', width: '52px', minHeight: '80px', justifyContent: 'center' },
  layoutFrame: { width: '100%', height: '18px', borderRadius: '3px', background: 'rgba(244,167,185,0.25)', border: '1px solid rgba(244,167,185,0.2)' },
  layoutLabel: { color: '#fdf0f5', fontSize: '13px', fontWeight: '500', fontFamily: "'DM Sans', sans-serif", textAlign: 'center' },
  layoutSub: { color: '#9b8fa0', fontSize: '11px', fontFamily: "'DM Sans', sans-serif", marginTop: '-6px' },
  camHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '12px' },
  switchCamBtn: { background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(244,167,185,0.25)', borderRadius: '12px', padding: '10px 16px', color: '#f4a7b9', cursor: 'pointer', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', whiteSpace: 'nowrap', flexShrink: 0 },
  camWrap: { width: '100%', maxWidth: '480px', aspectRatio: '4/3', borderRadius: '20px', overflow: 'hidden', position: 'relative', background: '#0f0a14', border: '2px solid rgba(244,167,185,0.2)' },
  video: { width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'filter 0.2s' },
  countdown: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '100px', color: '#fff', textShadow: '0 2px 24px rgba(0,0,0,0.6)', background: 'rgba(0,0,0,0.3)', fontFamily: "'Playfair Display', serif", pointerEvents: 'none' },
  filterRow: { display: 'flex', gap: '8px', overflowX: 'auto', width: '100%', paddingBottom: '6px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' },
  filterBtn: { background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(244,167,185,0.15)', borderRadius: '20px', padding: '8px 14px', color: '#9b8fa0', cursor: 'pointer', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', whiteSpace: 'nowrap', flexShrink: 0 },
  filterBtnActive: { background: 'linear-gradient(135deg, #f4a7b9, #e879a0)', border: '1.5px solid transparent', color: '#fff', fontWeight: '500' },
  shotProgress: { display: 'flex', gap: '10px', justifyContent: 'center' },
  shotThumb: { width: '52px', height: '52px', borderRadius: '10px', border: '2px solid rgba(244,167,185,0.2)', background: '#2c1f2e', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  shotThumbActive: { border: '2px solid #e879a0', boxShadow: '0 0 12px rgba(232,121,160,0.4)' },
  shotThumbDone: { border: '2px solid rgba(244,167,185,0.5)' },
  shotThumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  reviewGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', width: '100%' },
  reviewFrame: { borderRadius: '14px', overflow: 'hidden', background: '#2c1f2e', border: '1px solid rgba(244,167,185,0.15)', display: 'flex', flexDirection: 'column' },
  reviewImg: { width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' },
  retakeBtn: { width: '100%', background: 'rgba(232,121,160,0.85)', color: '#fff', border: 'none', padding: '9px 8px', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', fontWeight: '500', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' },
  reviewLabel: { textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontFamily: "'DM Sans', sans-serif", padding: '4px 0', background: '#1a0f1e' },
  stripPreview: { width: '100%', maxWidth: '340px', height: 'auto', borderRadius: '16px', boxShadow: '0 8px 40px rgba(0,0,0,0.5)', border: '1px solid rgba(244,167,185,0.2)' },
  captionInput: { padding: '14px 16px', borderRadius: '12px', border: '1.5px solid rgba(244,167,185,0.2)', fontSize: '16px', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: 'rgba(255,255,255,0.06)', color: '#fff', width: '100%' },
  btnRow: { display: 'flex', gap: '10px', width: '100%', flexWrap: 'wrap' },
  btnPink: { flex: 1, background: 'linear-gradient(135deg, #f4a7b9, #e879a0)', color: '#fff', border: 'none', borderRadius: '14px', padding: '16px 12px', fontSize: '15px', fontFamily: "'DM Sans', sans-serif", fontWeight: '500', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', boxShadow: '0 4px 16px rgba(232,121,160,0.3)' },
  btnOutline: { flex: 1, background: 'none', color: '#f4a7b9', border: '1.5px solid rgba(244,167,185,0.3)', borderRadius: '14px', padding: '16px 12px', fontSize: '15px', fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' },
  successMsg: { textAlign: 'center', color: '#e879a0', background: 'rgba(232,121,160,0.1)', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: '500', border: '1px solid rgba(232,121,160,0.2)', width: '100%' },
}
