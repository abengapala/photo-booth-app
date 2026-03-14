'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import imageCompression from 'browser-image-compression'

export default function UploadPage() {
  const router   = useRouter()
  const supabase = createClient()

  // -- auth guard --
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/login')
    })
  }, [])

  // -- tabs --
  const [tab, setTab] = useState('booth') // 'booth' | 'upload'

  // -- photobooth state --
  const videoRef      = useRef(null)
  const canvasRef     = useRef(null)
  const streamRef     = useRef(null)
  const [camOn,    setCamOn]    = useState(false)
  const [shots,    setShots]    = useState([])
  const [countdown,setCountdown]= useState(null)
  const [flashing, setFlashing] = useState(false)
  const [boothDone,setBoothDone]= useState(false)

  // -- upload state --
  const [files,    setFiles]    = useState([])
  const [previews, setPreviews] = useState([])
  const [caption,  setCaption]  = useState('')
  const [uploading,setUploading]= useState(false)
  const [success,  setSuccess]  = useState(false)

  // ── Camera helpers ──────────────────────────────────────────
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      })
      streamRef.current          = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setCamOn(true)
      setShots([])
      setBoothDone(false)
    } catch {
      alert('No camera found on this device 📷 — Use the Upload tab instead!')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setCamOn(false)
  }

  const takeShot = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    canvas.width  = video.videoWidth  || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext('2d').drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setFlashing(true)
    setTimeout(() => setFlashing(false), 200)
    return dataUrl
  }, [])

  async function runBoothSequence() {
    if (shots.length >= 4) return
    const captured = [...shots]
    for (let i = 0; i < 4 - shots.length; i++) {
      for (let c = 3; c >= 1; c--) {
        setCountdown(c)
        await wait(1000)
      }
      setCountdown('📸')
      await wait(300)
      const shot = takeShot()
      captured.push(shot)
      setShots([...captured])
      setCountdown(null)
      await wait(600)
    }
    setBoothDone(true)
    stopCamera()
  }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)) }

  // ── File upload helpers ──────────────────────────────────────
  function handleFileChange(e) {
    const selected = Array.from(e.target.files)
    setFiles(selected)
    setPreviews(selected.map(f => URL.createObjectURL(f)))
    setSuccess(false)
  }

  async function uploadOne(fileOrBlob, name) {
    const compressed = await imageCompression(fileOrBlob, {
      maxSizeMB: 0.4,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    })
    const path = `${Date.now()}_${name}`
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

    // 🔔 Telegram notification
    try {
      await fetch('/api/notify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoUrl:   data.publicUrl,
          caption:    caption || null,
          uploadedAt,
        }),
      })
    } catch {
      console.log('Notification failed but upload succeeded')
    }

    return data.publicUrl
  }

  function dataURLtoBlob(dataUrl) {
    const [header, base64] = dataUrl.split(',')
    const mime   = header.match(/:(.*?);/)[1]
    const binary = atob(base64)
    const arr    = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
    return new Blob([arr], { type: mime })
  }

  async function submitBooth() {
    if (!shots.length) return
    setUploading(true)
    try {
      for (let i = 0; i < shots.length; i++) {
        const blob = dataURLtoBlob(shots[i])
        await uploadOne(blob, `booth_shot_${i + 1}.jpg`)
      }
      setSuccess(true)
      setShots([])
      setBoothDone(false)
    } catch (e) {
      alert('Upload failed: ' + e.message)
    }
    setUploading(false)
  }

  async function submitFiles() {
    if (!files.length) return
    setUploading(true)
    try {
      for (const f of files) await uploadOne(f, f.name)
      setSuccess(true)
      setFiles([])
      setPreviews([])
    } catch (e) {
      alert('Upload failed: ' + e.message)
    }
    setUploading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ── UI ───────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      {flashing && <div style={s.flash} />}

      {/* header */}
      <div style={s.header}>
        <div>
          <h1 style={s.logo}>📷 Our Booth</h1>
          <p style={s.logoSub}>your photos, our memories ♡</p>
        </div>
        <button style={s.logout} onClick={handleLogout}>Sign out</button>
      </div>

      {/* tabs */}
      <div style={s.tabs}>
        <button
          style={{ ...s.tab, ...(tab === 'booth' ? s.tabActive : {}) }}
          onClick={() => { setTab('booth'); stopCamera() }}
        >🎞 Photobooth</button>
        <button
          style={{ ...s.tab, ...(tab === 'upload' ? s.tabActive : {}) }}
          onClick={() => { setTab('upload'); stopCamera() }}
        >🖼 Upload</button>
      </div>

      {/* ── PHOTOBOOTH TAB ── */}
      {tab === 'booth' && (
        <div style={s.card}>
          <h2 style={s.cardTitle}>Photobooth Strip</h2>
          <p style={s.cardSub}>Takes 4 shots automatically — strike a pose! 🌸</p>

          <div style={s.boothLayout}>
            {/* camera */}
            <div style={s.camBox}>
              <video
                ref={videoRef}
                style={{ ...s.video, display: camOn ? 'block' : 'none' }}
                playsInline muted
              />
              {!camOn && !boothDone && (
                <div style={s.camPlaceholder}>
                  <span style={{ fontSize: 48 }}>📸</span>
                  <p style={{ color: '#9b8fa0', marginTop: 10, fontSize: 13 }}>Camera is off</p>
                </div>
              )}
              {boothDone && (
                <div style={s.camPlaceholder}>
                  <span style={{ fontSize: 44 }}>🎉</span>
                  <p style={{ color: '#e879a0', marginTop: 10, fontWeight: 500 }}>4 shots taken!</p>
                </div>
              )}
              {countdown !== null && (
                <div style={s.countdown}>{countdown}</div>
              )}
            </div>

            {/* strip preview */}
            <div style={s.strip}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={s.stripFrame}>
                  {shots[i]
                    ? <img src={shots[i]} style={s.stripImg} alt={`shot ${i+1}`} />
                    : <div style={s.stripEmpty}>{i + 1}</div>
                  }
                </div>
              ))}
            </div>
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <input
            style={s.captionInput}
            placeholder="Add a caption (optional) ♡"
            value={caption}
            onChange={e => setCaption(e.target.value)}
          />

          <div style={s.btnRow}>
            {!camOn && !boothDone && (
              <button style={s.btnPink} onClick={startCamera}>Start Camera</button>
            )}
            {camOn && shots.length < 4 && (
              <button style={s.btnPink} onClick={runBoothSequence}>📸 Take 4 Shots!</button>
            )}
            {boothDone && (
              <>
                <button style={s.btnOutline} onClick={() => { setBoothDone(false); setShots([]); startCamera() }}>
                  Retake
                </button>
                <button
                  style={{ ...s.btnPink, opacity: uploading ? 0.7 : 1 }}
                  onClick={submitBooth}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : '💾 Save Strip'}
                </button>
              </>
            )}
          </div>

          {success && tab === 'booth' && (
            <p style={s.successMsg}>✨ Saved to our album! He can see it now 💕</p>
          )}
        </div>
      )}

      {/* ── UPLOAD TAB ── */}
      {tab === 'upload' && (
        <div style={s.card}>
          <h2 style={s.cardTitle}>Upload Photos</h2>
          <p style={s.cardSub}>Pick photos from your phone or PC 🌸</p>

          <label style={s.dropZone}>
            <input
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {previews.length === 0 ? (
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 44 }}>🖼️</span>
                <p style={{ color: '#9b8fa0', marginTop: 10, fontSize: 14 }}>
                  Tap to choose photos
                </p>
              </div>
            ) : (
              <div style={s.previewGrid}>
                {previews.map((p, i) => (
                  <img key={i} src={p} style={s.previewImg} alt="" />
                ))}
              </div>
            )}
          </label>

          <input
            style={s.captionInput}
            placeholder="Add a caption (optional) ♡"
            value={caption}
            onChange={e => setCaption(e.target.value)}
          />

          {files.length > 0 && (
            <button
              style={{ ...s.btnPink, opacity: uploading ? 0.7 : 1 }}
              onClick={submitFiles}
              disabled={uploading}
            >
              {uploading ? `Uploading ${files.length} photo(s)...` : `💾 Upload ${files.length} Photo(s)`}
            </button>
          )}

          {success && tab === 'upload' && (
            <p style={s.successMsg}>✨ Saved to our album! He can see it now 💕</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Styles ───────────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #fdf0f5 0%, #fdf6f0 60%, #f5f0fd 100%)',
    padding: '0 0 80px',
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
    borderBottom: '1px solid rgba(244,167,185,0.2)',
    background: 'rgba(255,255,255,0.8)',
    backdropFilter: 'blur(8px)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  logo: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '20px',
    color: '#2c1f2e',
  },
  logoSub: {
    fontSize: '11px',
    color: '#9b8fa0',
    marginTop: 2,
  },
  logout: {
    background: 'none',
    border: '1px solid #f4a7b9',
    borderRadius: '10px',
    padding: '8px 14px',
    color: '#e879a0',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: "'DM Sans', sans-serif",
    WebkitTapHighlightColor: 'transparent',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    padding: '16px 16px 0',
    maxWidth: '720px',
    margin: '0 auto',
  },
  tab: {
    flex: 1,
    padding: '12px 8px',
    borderRadius: '12px',
    border: '1.5px solid #f0e4ea',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: "'DM Sans', sans-serif",
    color: '#9b8fa0',
    WebkitTapHighlightColor: 'transparent',
  },
  tabActive: {
    background: 'linear-gradient(135deg, #f4a7b9, #e879a0)',
    border: '1.5px solid transparent',
    color: '#fff',
    fontWeight: '500',
  },
  card: {
    maxWidth: '720px',
    margin: '16px auto',
    marginLeft: '12px',
    marginRight: '12px',
    background: '#fff',
    borderRadius: '20px',
    padding: '24px 18px',
    boxShadow: '0 4px 30px rgba(244,167,185,0.12)',
    border: '1px solid rgba(244,167,185,0.15)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  cardTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '22px',
    color: '#2c1f2e',
  },
  cardSub: {
    fontSize: '13px',
    color: '#9b8fa0',
    marginTop: '-8px',
  },
  boothLayout: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  camBox: {
    width: '100%',
    minHeight: '240px',
    background: '#fdf0f5',
    borderRadius: '16px',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px dashed #f4a7b9',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '14px',
    transform: 'scaleX(-1)',
  },
  camPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
  },
  countdown: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '80px',
    fontFamily: "'Playfair Display', serif",
    color: '#fff',
    textShadow: '0 2px 20px rgba(0,0,0,0.4)',
    background: 'rgba(0,0,0,0.25)',
    pointerEvents: 'none',
  },
  // horizontal strip on mobile
  strip: {
    display: 'flex',
    flexDirection: 'row',
    gap: '8px',
    background: '#2c1f2e',
    padding: '10px',
    borderRadius: '12px',
    justifyContent: 'center',
    overflowX: 'auto',
  },
  stripFrame: {
    width: '72px',
    height: '80px',
    borderRadius: '6px',
    overflow: 'hidden',
    background: '#3d2e40',
    flexShrink: 0,
  },
  stripImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)',
  },
  stripEmpty: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b5070',
    fontSize: '18px',
    fontFamily: "'Playfair Display', serif",
  },
  captionInput: {
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1.5px solid #f0e4ea',
    fontSize: '16px', // 16px prevents iOS zoom on focus!
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    background: '#fdf8fa',
    color: '#2c1f2e',
    width: '100%',
  },
  btnRow: {
    display: 'flex',
    gap: '10px',
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
  },
  btnOutline: {
    flex: 1,
    background: 'none',
    color: '#e879a0',
    border: '1.5px solid #f4a7b9',
    borderRadius: '14px',
    padding: '16px 12px',
    fontSize: '15px',
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
  },
  dropZone: {
    display: 'flex',
    border: '2px dashed #f4a7b9',
    borderRadius: '16px',
    padding: '28px 16px',
    cursor: 'pointer',
    background: '#fdf8fa',
    minHeight: '140px',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  previewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
    gap: '8px',
    width: '100%',
  },
  previewImg: {
    width: '100%',
    aspectRatio: '1',
    objectFit: 'cover',
    borderRadius: '10px',
  },
  successMsg: {
    textAlign: 'center',
    color: '#e879a0',
    background: '#fff0f6',
    padding: '14px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '500',
  },
}
