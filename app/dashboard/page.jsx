'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function DashboardPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [photos,  setPhotos]  = useState([])
  const [loading, setLoading] = useState(true)
  const [view,    setView]    = useState('grid')   // 'grid' | 'strip'
  const [selected,setSelected]= useState(null)     // lightbox photo
  const [deleting,setDeleting]= useState(null)

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

  // ── Delete a photo ───────────────────────────────────────────
  async function deletePhoto(photo) {
    setDeleting(photo.id)
    // extract storage path from URL
    const path = photo.url.split('/photos/')[1]
    await supabase.storage.from('photos').remove([path])
    await supabase.from('photos').delete().eq('id', photo.id)
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
    if (selected?.id === photo.id) setSelected(null)
    setDeleting(null)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ── Format date ──────────────────────────────────────────────
  function formatDate(str) {
    return new Date(str).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
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
              <div>
                {selected.caption && (
                  <p style={s.lightboxCaption}>"{selected.caption}"</p>
                )}
                <p style={s.lightboxDate}>📅 {formatDate(selected.created_at)}</p>
              </div>
              <div style={s.lightboxActions}>
                <a href={selected.url} download target="_blank" style={s.btnDownload}>
                  ⬇ Download
                </a>
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
          <h1 style={s.logo}>💕 Our Album</h1>
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
              <img src={photo.url} style={s.gridImg} alt="" />
              <div style={s.gridOverlay}>
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
              {/* film strip top holes */}
              <div style={s.filmHoles}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} style={s.filmHole} />
                ))}
              </div>

              <div style={s.stripFrames}>
                {group.map((photo, i) => (
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
                {/* fill empty slots */}
                {[...Array(4 - group.length)].map((_, i) => (
                  <div key={`empty-${i}`} style={s.stripFrameEmpty} />
                ))}
              </div>

              {/* film strip bottom holes */}
              <div style={s.filmHoles}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} style={s.filmHole} />
                ))}
              </div>

              <p style={s.stripDate}>
                {formatDate(group[0].created_at)}
              </p>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

// split array into chunks of n
function chunkArray(arr, n) {
  const chunks = []
  for (let i = 0; i < arr.length; i += n) {
    chunks.push(arr.slice(i, i + n))
  }
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
    padding: '24px 32px',
    borderBottom: '1px solid rgba(244,167,185,0.15)',
    background: 'rgba(0,0,0,0.2)',
    backdropFilter: 'blur(8px)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    flexWrap: 'wrap',
    gap: '12px',
  },
  logo: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '24px',
    color: '#fdf0f5',
  },
  logoSub: {
    fontSize: '12px',
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
    padding: '8px 16px',
    color: '#9b8fa0',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: "'DM Sans', sans-serif",
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
    padding: '8px 16px',
    color: '#f4a7b9',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: "'DM Sans', sans-serif",
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

  // Grid
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '16px',
    padding: '32px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  gridItem: {
    position: 'relative',
    borderRadius: '16px',
    overflow: 'hidden',
    cursor: 'pointer',
    aspectRatio: '1',
    background: '#2c1f2e',
    transition: 'transform 0.2s',
  },
  gridImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    transition: 'transform 0.3s',
  },
  gridOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
    padding: '20px 14px 14px',
    opacity: 0,
    transition: 'opacity 0.2s',
  },
  gridCaption: {
    color: '#fff',
    fontSize: '13px',
    fontStyle: 'italic',
    marginBottom: '4px',
  },
  gridDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '11px',
  },

  // Strip
  stripPage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '40px',
    padding: '40px 20px',
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
    gap: '4px',
    padding: '4px',
    background: '#111',
  },
  stripFrame: {
    cursor: 'pointer',
    position: 'relative',
    aspectRatio: '3/4',
    overflow: 'hidden',
    background: '#2c1f2e',
  },
  stripImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
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
    aspectRatio: '3/4',
    background: '#1a1025',
    border: '1px dashed #2c2c2c',
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

  // Lightbox
  lightboxBg: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    backdropFilter: 'blur(6px)',
  },
  lightboxCard: {
    background: '#2c1f2e',
    borderRadius: '20px',
    overflow: 'hidden',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
    border: '1px solid rgba(244,167,185,0.15)',
  },
  lightboxImg: {
    width: '100%',
    maxHeight: '420px',
    objectFit: 'cover',
    display: 'block',
  },
  lightboxInfo: {
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  lightboxCaption: {
    fontFamily: "'Playfair Display', serif",
    fontStyle: 'italic',
    color: '#fdf0f5',
    fontSize: '16px',
    marginBottom: '6px',
  },
  lightboxDate: {
    color: '#9b8fa0',
    fontSize: '13px',
  },
  lightboxActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  btnDownload: {
    background: 'rgba(255,255,255,0.08)',
    color: '#fdf0f5',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    padding: '8px 14px',
    fontSize: '13px',
    cursor: 'pointer',
    textDecoration: 'none',
    fontFamily: "'DM Sans', sans-serif",
  },
  btnDelete: {
    background: 'rgba(220,50,50,0.15)',
    color: '#ff8080',
    border: '1px solid rgba(220,50,50,0.3)',
    borderRadius: '10px',
    padding: '8px 14px',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  btnClose: {
    background: 'rgba(255,255,255,0.08)',
    color: '#9b8fa0',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '8px 14px',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
}