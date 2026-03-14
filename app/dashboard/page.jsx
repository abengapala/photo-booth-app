'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function DashboardPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [photos,   setPhotos]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [view,     setView]     = useState('grid')  // 'grid' | 'strip'
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(null)

  // ── Auth guard ───────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/login')
      else fetchPhotos()
    })
  }, [])

  // ── Fetch all photos ─────────────────────────────────────────
  async function fetchPhotos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setPhotos(data || [])
    setLoading(false)
  }

  // ── Delete ───────────────────────────────────────────────────
  async function deletePhoto(photo) {
    setDeleting(photo.id)
    try {
      const urlParts = photo.url.split('/storage/v1/object/public/photos/')
      const filePath = urlParts[1]
      if (filePath) {
        await supabase.storage.from('photos').remove([filePath])
      }
      await supabase.from('photos').delete().eq('id', photo.id)
      setPhotos(prev => prev.filter(p => p.id !== photo.id))
      if (selected?.id === photo.id) setSelected(null)
    } catch (e) {
      alert('Delete failed: ' + e.message)
    }
    setDeleting(null)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function formatDate(str) {
    return new Date(str).toLocaleDateString('en-PH', {
      month: 'long', day: 'numeric', year: 'numeric',
      timeZone: 'Asia/Manila',
    })
  }

  function formatTime(str) {
    return new Date(str).toLocaleTimeString('en-PH', {
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Manila',
    })
  }

  // ── UI ───────────────────────────────────────────────────────
  return (
    <div style={s.page}>

      {/* Lightbox */}
      {selected && (
        <div style={s.lightboxBg} onClick={() => setSelected(null)}>
          <div style={s.lightboxCard} onClick={e => e.stopPropagation()}>
            <img src={selected.url} style={s.lightboxImg} alt="" />
            <div style={s.lightboxInfo}>
              <div style={{ flex: 1 }}>
                {selected.caption && (
                  <p style={s.lightboxCaption}>"{selected.caption}"</p>
                )}
                <p style={s.lightboxDate}>
                  📅 {formatDate(selected.created_at)} · {formatTime(selected.created_at)}
                </p>
              </div>
              <div style={s.lightboxActions}>
                <a
                  href={selected.url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  style={s.btnDownload}
                >⬇ Download</a>
                <button
                  style={s.btnDelete}
                  onClick={() => deletePhoto(selected)}
                  disabled={deleting === selected.id}
                >
                  {deleting === selected.id ? 'Deleting...' : '🗑 Delete'}
                </button>
                <button style={s.btnClose} onClick={() => setSelected(null)}>
                  ✕ Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.logo}>💕 Deidree's Album</h1>
          <p style={s.logoSub}>{photos.length} memories so far ♡</p>
        </div>
        <div style={s.headerRight}>
          <button
            style={{ ...s.viewBtn, ...(view === 'grid'  ? s.viewBtnActive : {}) }}
            onClick={() => setView('grid')}
          >🖼 Grid</button>
          <button
            style={{ ...s.viewBtn, ...(view === 'strip' ? s.viewBtnActive : {}) }}
            onClick={() => setView('strip')}
          >🎞 Strip</button>
          <button style={s.logout} onClick={handleLogout}>Sign out</button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={s.emptyState}>
          <span style={{ fontSize: 48 }}>⏳</span>
          <p style={{ color: '#9b8fa0', marginTop: 12 }}>Loading memories...</p>
        </div>
      )}

      {/* Empty */}
      {!loading && photos.length === 0 && (
        <div style={s.emptyState}>
          <span style={{ fontSize: 64 }}>📭</span>
          <p style={s.emptyTitle}>No photos yet</p>
          <p style={s.emptySub}>She hasn't uploaded anything yet ♡</p>
        </div>
      )}

      {/* ── GRID VIEW ── */}
      {!loading && photos.length > 0 && view === 'grid' && (
        <div style={s.grid}>
          {photos.map(photo => (
            <div
              key={photo.id}
              style={s.gridItem}
              onClick={() => setSelected(photo)}
            >
              {/* full image — no crop */}
              <img src={photo.url} style={s.gridImg} alt="" />
              <div style={s.gridFooter}>
                {photo.caption && (
                  <p style={s.gridCaption}>"{photo.caption}"</p>
                )}
                <p style={s.gridDate}>{formatDate(photo.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── STRIP VIEW ── */}
      {!loading && photos.length > 0 && view === 'strip' && (
        <div style={s.stripPage}>
          {chunkArray(photos, 4).map((group, gi) => (
            <div key={gi} style={s.stripCard}>
              {/* film holes top */}
              <div style={s.filmHoles}>
                {[...Array(8)].map((_, i) => <div key={i} style={s.filmHole} />)}
              </div>

              <div style={s.stripFrames}>
                {group.map((photo) => (
                  <div
                    key={photo.id}
                    style={s.stripFrame}
                    onClick={() => setSelected(photo)}
                  >
                    <img src={photo.url} style={s.stripImg} alt="" />
                    {photo.caption && (
                      <p style={s.stripCaption}>"{photo.caption}"</p>
                    )}
                  </div>
                ))}
                {[...Array(4 - group.length)].map((_, i) => (
                  <div key={`empty-${i}`} style={s.stripFrameEmpty} />
                ))}
              </div>

              {/* film holes bottom */}
              <div style={s.filmHoles}>
                {[...Array(8)].map((_, i) => <div key={i} style={s.filmHole} />)}
              </div>

              <p style={s.stripDate}>{formatDate(group[0].created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function chunkArray(arr, n) {
  const chunks = []
  for (let i = 0; i < arr.length; i += n) chunks.push(arr.slice(i, i + n))
  return chunks
}

// ── Styles ────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1025 0%, #2c1f2e 60%, #1a2030 100%)',
    paddingBottom: '60px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(244,167,185,0.15)',
    background: 'rgba(0,0,0,0.2)',
    backdropFilter: 'blur(8px)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    flexWrap: 'wrap',
    gap: '10px',
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
  headerRight: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  viewBtn: {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(244,167,185,0.2)',
    borderRadius: '10px',
    padding: '8px 14px',
    color: '#9b8fa0',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: "'DM Sans', sans-serif",
    WebkitTapHighlightColor: 'transparent',
  },
  viewBtnActive: {
    background: 'linear-gradient(135deg, #f4a7b9, #e879a0)',
    border: '1px solid transparent',
    color: '#fff',
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
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '8px',
  },
  emptyTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '24px',
    color: '#fdf0f5',
    marginTop: '8px',
  },
  emptySub: {
    fontSize: '14px',
    color: '#9b8fa0',
  },

  // ── Grid ──────────────────────────────────────────────────────
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
    padding: '24px 16px',
    maxWidth: '1200px',
    margin: '0 auto',
    alignItems: 'start', // key! stops cards stretching to equal height
  },
  gridItem: {
    borderRadius: '16px',
    overflow: 'hidden',
    cursor: 'pointer',
    background: '#2c1f2e',
    border: '1px solid rgba(244,167,185,0.1)',
    transition: 'transform 0.2s',
    // NO fixed height or aspectRatio — lets strip show full height
  },
  gridImg: {
    width: '100%',
    height: 'auto',       // full image height — no crop!
    objectFit: 'contain', // show entire strip
    display: 'block',
    background: '#1a0f1e',
  },
  gridFooter: {
    padding: '10px 12px',
    background: '#2c1f2e',
  },
  gridCaption: {
    color: '#fdf0f5',
    fontSize: '12px',
    fontStyle: 'italic',
    marginBottom: '4px',
    fontFamily: "'Playfair Display', serif",
  },
  gridDate: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '11px',
    fontFamily: "'DM Sans', sans-serif",
  },

  // ── Strip view ────────────────────────────────────────────────
  stripPage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '40px',
    padding: '32px 16px',
  },
  stripCard: {
    background: '#1a1025',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
    maxWidth: '520px',
    width: '100%',
  },
  filmHoles: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    background: '#111',
    padding: '6px 12px',
  },
  filmHole: {
    width: '14px',
    height: '10px',
    borderRadius: '2px',
    background: '#2c2c2c',
    border: '1px solid #333',
  },
  stripFrames: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '3px',
    padding: '3px',
    background: '#111',
  },
  stripFrame: {
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    background: '#2c1f2e',
  },
  stripImg: {
    width: '100%',
    height: 'auto',       // show full strip image
    objectFit: 'contain',
    display: 'block',
  },
  stripCaption: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    background: 'rgba(0,0,0,0.6)',
    color: '#fff',
    fontSize: '9px',
    padding: '4px',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  stripFrameEmpty: {
    background: '#1a1025',
    border: '1px dashed #2c2c2c',
    minHeight: '80px',
  },
  stripDate: {
    textAlign: 'center',
    color: '#9b8fa0',
    fontSize: '11px',
    padding: '8px',
    background: '#111',
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '0.05em',
  },

  // ── Lightbox ──────────────────────────────────────────────────
  lightboxBg: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.88)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    backdropFilter: 'blur(6px)',
    overflowY: 'auto',
  },
  lightboxCard: {
    background: '#2c1f2e',
    borderRadius: '20px',
    overflow: 'hidden',
    width: '100%',
    maxWidth: '520px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
    border: '1px solid rgba(244,167,185,0.15)',
  },
  lightboxImg: {
    width: '100%',
    height: 'auto',       // show full strip in lightbox too!
    objectFit: 'contain',
    display: 'block',
    background: '#1a0f1e',
    maxHeight: '70vh',
  },
  lightboxInfo: {
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '12px',
  },
  lightboxCaption: {
    fontFamily: "'Playfair Display', serif",
    fontStyle: 'italic',
    color: '#fdf0f5',
    fontSize: '15px',
    marginBottom: '6px',
  },
  lightboxDate: {
    color: '#9b8fa0',
    fontSize: '12px',
    fontFamily: "'DM Sans', sans-serif",
  },
  lightboxActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    width: '100%',
  },
  btnDownload: {
    flex: 1,
    textAlign: 'center',
    background: 'rgba(255,255,255,0.08)',
    color: '#fdf0f5',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '13px',
    cursor: 'pointer',
    textDecoration: 'none',
    fontFamily: "'DM Sans', sans-serif",
  },
  btnDelete: {
    flex: 1,
    textAlign: 'center',
    background: 'rgba(220,50,50,0.15)',
    color: '#ff8080',
    border: '1px solid rgba(220,50,50,0.3)',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  btnClose: {
    flex: 1,
    textAlign: 'center',
    background: 'rgba(255,255,255,0.06)',
    color: '#9b8fa0',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
}
