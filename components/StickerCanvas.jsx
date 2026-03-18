'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

// ── STICKER SYSTEM ────────────────────────────────────────────
// To add more stickers:
// 1. Put your PNG files in  public/stickers/
// 2. Add the filename to this array below
// Example: 'bow.png', 'sparkle.png', 'heart.png'

const STICKER_FILES = [
  'sticker1.png',
  'sticker2.png',
  'sticker3.png',
  'sticker4.png',
  'sticker5.png',
  'sticker6.png',
  'sticker7.png',
  'sticker8.png',
  'sticker9.png',
  'sticker10.png',
]

// ── Draggable Sticker Canvas Component ───────────────────────
export default function StickerCanvas({ photoUrl, onDone, onCancel }) {
  const canvasRef    = useRef(null)
  const containerRef = useRef(null)
  const [stickers,   setStickers]   = useState([])   // { id, src, x, y, size, img }
  const [selected,   setSelected]   = useState(null) // selected sticker id
  const [dragging,   setDragging]   = useState(null) // { id, startX, startY, origX, origY }
  const [imgLoaded,  setImgLoaded]  = useState(false)

  // load background photo onto canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const img    = new Image()
    img.onload   = () => {
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)
      setImgLoaded(true)
    }
    img.src = photoUrl
  }, [photoUrl])

  // add a sticker to the canvas
  function addSticker(src) {
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      setStickers(prev => [...prev, {
        id:   Date.now() + Math.random(),
        src,
        img,
        x:    canvas.width  / 2 - 60,
        y:    canvas.height / 2 - 60,
        size: 120,
      }])
    }
    img.src = src
  }

  function removeSticker(id) {
    setStickers(prev => prev.filter(s => s.id !== id))
    setSelected(null)
  }

  // ── Touch / Mouse drag ────────────────────────────────────
  function getPos(e) {
    const canvas = canvasRef.current
    const rect   = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    const touch  = e.touches?.[0] || e
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top)  * scaleY,
    }
  }

  function onPointerDown(e) {
    const pos = getPos(e)
    // find topmost sticker under pointer (reverse order)
    const hit = [...stickers].reverse().find(s =>
      pos.x >= s.x && pos.x <= s.x + s.size &&
      pos.y >= s.y && pos.y <= s.y + s.size
    )
    if (hit) {
      setSelected(hit.id)
      setDragging({ id: hit.id, startX: pos.x, startY: pos.y, origX: hit.x, origY: hit.y })
      e.preventDefault()
    } else {
      setSelected(null)
    }
  }

  function onPointerMove(e) {
    if (!dragging) return
    const pos = getPos(e)
    const dx  = pos.x - dragging.startX
    const dy  = pos.y - dragging.startY
    setStickers(prev => prev.map(s =>
      s.id === dragging.id
        ? { ...s, x: dragging.origX + dx, y: dragging.origY + dy }
        : s
    ))
    e.preventDefault()
  }

  function onPointerUp() { setDragging(null) }

  // ── Pinch to resize (mobile) ──────────────────────────────
  const lastPinchDist = useRef(null)

  function onTouchStart(e) {
    if (e.touches.length === 2 && selected) {
      const dx   = e.touches[0].clientX - e.touches[1].clientX
      const dy   = e.touches[0].clientY - e.touches[1].clientY
      lastPinchDist.current = Math.sqrt(dx*dx + dy*dy)
    } else {
      onPointerDown(e)
    }
  }

  function onTouchMove(e) {
    if (e.touches.length === 2 && selected) {
      const dx   = e.touches[0].clientX - e.touches[1].clientX
      const dy   = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx*dx + dy*dy)
      if (lastPinchDist.current) {
        const scale = dist / lastPinchDist.current
        setStickers(prev => prev.map(s =>
          s.id === selected
            ? { ...s, size: Math.max(40, Math.min(400, s.size * scale)) }
            : s
        ))
      }
      lastPinchDist.current = dist
      e.preventDefault()
    } else {
      onPointerMove(e)
    }
  }

  function onTouchEnd() {
    lastPinchDist.current = null
    onPointerUp()
  }

  // ── Burn stickers into final image ───────────────────────
  function burnAndDone() {
    const canvas  = canvasRef.current
    const out     = document.createElement('canvas')
    out.width     = canvas.width
    out.height    = canvas.height
    const ctx     = out.getContext('2d')

    // draw background photo
    ctx.drawImage(canvas, 0, 0)

    // draw all stickers on top
    stickers.forEach(s => {
      ctx.drawImage(s.img, s.x, s.y, s.size, s.size)
    })

    onDone(out.toDataURL('image/jpeg', 0.92))
  }

  const canvas = canvasRef.current
  const scale  = canvas
    ? (containerRef.current?.getBoundingClientRect().width || 400) / canvas.width
    : 1

  return (
    <div style={ss.wrap}>
      <p style={ss.hint}>Tap a sticker to add • Drag to move • Pinch to resize</p>

      {/* canvas + sticker overlays */}
      <div ref={containerRef} style={ss.canvasWrap}>
        <canvas ref={canvasRef} style={ss.canvas}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />

        {/* sticker overlays — rendered as DOM elements for smooth drag */}
        {imgLoaded && canvas && stickers.map(s => (
          <div key={s.id} style={{
            position:  'absolute',
            left:      s.x * scale + 'px',
            top:       s.y * scale + 'px',
            width:     s.size * scale + 'px',
            height:    s.size * scale + 'px',
            cursor:    'grab',
            userSelect:'none',
            outline:   selected === s.id ? '2px dashed rgba(244,167,185,0.8)' : 'none',
            borderRadius: '4px',
          }}
            onMouseDown={onPointerDown}
            onTouchStart={onTouchStart}
          >
            <img src={s.src} style={{ width:'100%', height:'100%', objectFit:'contain', pointerEvents:'none', userSelect:'none' }} draggable={false} alt="" />
            {/* remove button */}
            {selected === s.id && (
              <button
                style={ss.removeBtn}
                onMouseDown={e => { e.stopPropagation(); removeSticker(s.id) }}
                onTouchStart={e => { e.stopPropagation(); removeSticker(s.id) }}
              >✕</button>
            )}
            {/* resize handle */}
            {selected === s.id && (
              <div
                style={ss.resizeHandle}
                onMouseDown={e => {
                  e.stopPropagation()
                  const startSize = s.size
                  const startX    = e.clientX
                  const onMove    = ev => {
                    const delta = ev.clientX - startX
                    setStickers(prev => prev.map(st =>
                      st.id === s.id
                        ? { ...st, size: Math.max(40, Math.min(400, startSize + delta / scale)) }
                        : st
                    ))
                  }
                  const onUp = () => {
                    window.removeEventListener('mousemove', onMove)
                    window.removeEventListener('mouseup',   onUp)
                  }
                  window.addEventListener('mousemove', onMove)
                  window.addEventListener('mouseup',   onUp)
                }}
              >⤡</div>
            )}
          </div>
        ))}
      </div>

      {/* sticker tray */}
      <div style={ss.trayWrap}>
        <p style={ss.trayLabel}>tap to add sticker</p>
        <div style={ss.tray}>
          {STICKER_FILES.map(file => (
            <button
              key={file}
              style={ss.stickerBtn}
              onClick={() => addSticker(`/stickers/${file}`)}
            >
              <img
                src={`/stickers/${file}`}
                style={ss.stickerThumb}
                alt={file}
                onError={e => e.currentTarget.parentElement.style.display = 'none'}
              />
            </button>
          ))}
        </div>
      </div>

      {/* actions */}
      <div style={ss.actions}>
        <button style={ss.cancelBtn} onClick={onCancel}>← Back</button>
        <button style={ss.doneBtn}   onClick={burnAndDone}>✓ Done</button>
      </div>
    </div>
  )
}

const ss = {
  wrap: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    gap:           '12px',
    width:         '100%',
    maxWidth:      '520px',
    margin:        '0 auto',
    padding:       '0 16px 80px',
  },
  hint: {
    fontSize:   '12px',
    color:      'rgba(244,167,185,0.6)',
    textAlign:  'center',
    fontFamily: "'DM Sans', sans-serif",
  },
  canvasWrap: {
    position:   'relative',
    width:      '100%',
    borderRadius: '16px',
    overflow:   'hidden',
    border:     '1.5px solid rgba(244,167,185,0.2)',
    touchAction:'none',
    cursor:     'default',
  },
  canvas: {
    width:      '100%',
    height:     'auto',
    display:    'block',
    userSelect: 'none',
  },
  removeBtn: {
    position:   'absolute',
    top:        '-10px',
    right:      '-10px',
    width:      '22px',
    height:     '22px',
    borderRadius: '50%',
    background: '#e879a0',
    color:      '#fff',
    border:     'none',
    cursor:     'pointer',
    fontSize:   '11px',
    display:    'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    zIndex:     10,
    padding:    0,
  },
  resizeHandle: {
    position:   'absolute',
    bottom:     '-10px',
    right:      '-10px',
    width:      '22px',
    height:     '22px',
    borderRadius: '50%',
    background: 'rgba(244,167,185,0.9)',
    color:      '#fff',
    fontSize:   '12px',
    display:    'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor:     'se-resize',
    zIndex:     10,
  },
  trayWrap: {
    width:      '100%',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding:    '12px',
    border:     '1px solid rgba(244,167,185,0.15)',
  },
  trayLabel: {
    fontSize:   '11px',
    color:      'rgba(244,167,185,0.5)',
    marginBottom: '8px',
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '0.05em',
  },
  tray: {
    display:    'flex',
    gap:        '10px',
    overflowX:  'auto',
    paddingBottom: '4px',
    scrollbarWidth: 'none',
  },
  stickerBtn: {
    background: 'rgba(255,255,255,0.08)',
    border:     '1px solid rgba(244,167,185,0.2)',
    borderRadius: '12px',
    padding:    '6px',
    cursor:     'pointer',
    flexShrink: 0,
    width:      '60px',
    height:     '60px',
    display:    'flex',
    alignItems: 'center',
    justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent',
  },
  stickerThumb: {
    width:      '44px',
    height:     '44px',
    objectFit:  'contain',
  },
  actions: {
    display:    'flex',
    gap:        '12px',
    width:      '100%',
  },
  cancelBtn: {
    flex:       1,
    background: 'none',
    color:      '#f4a7b9',
    border:     '1.5px solid rgba(244,167,185,0.3)',
    borderRadius: '14px',
    padding:    '16px',
    fontSize:   '15px',
    fontFamily: "'DM Sans', sans-serif",
    cursor:     'pointer',
    WebkitTapHighlightColor: 'transparent',
  },
  doneBtn: {
    flex:       2,
    background: 'linear-gradient(135deg, #f4a7b9, #e879a0)',
    color:      '#fff',
    border:     'none',
    borderRadius: '14px',
    padding:    '16px',
    fontSize:   '15px',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: '500',
    cursor:     'pointer',
    WebkitTapHighlightColor: 'transparent',
    boxShadow:  '0 4px 16px rgba(232,121,160,0.3)',
  },
}
