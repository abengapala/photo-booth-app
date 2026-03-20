'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import imageCompression from 'browser-image-compression'
import StickerCanvas from '@/components/StickerCanvas'

const NORMAL_FILTERS = [
  { id:'normal',  label:'Normal',  emoji:'✨', css:'none',                                              matrix:null },
  { id:'bw',      label:'B&W',     emoji:'🖤', css:'grayscale(1) contrast(1.3) brightness(1.05)',        matrix:[0.299,0.587,0.114,0,0, 0.299,0.587,0.114,0,0, 0.299,0.587,0.114,0,0, 0,0,0,1,0] },
  { id:'dreamy',  label:'Dreamy',  emoji:'💫', css:'brightness(1.2) saturate(0.5) contrast(0.75)',       matrix:[0.85,0,0,0,0.15, 0,0.85,0,0,0.12, 0,0,0.85,0,0.15, 0,0,0,1,0] },
  { id:'warm',    label:'Warm',    emoji:'🌅', css:'sepia(0.6) saturate(1.8) brightness(1.1)',           matrix:[1.4,0.2,0,0,0.08, 0.1,1.0,0,0,0.03, 0,0,0.5,0,-0.1, 0,0,0,1,0] },
  { id:'vintage', label:'Vintage', emoji:'📷', css:'sepia(0.8) contrast(1.2) brightness(0.9)',           matrix:[1.0,0.3,0.1,0,0, 0.1,0.8,0.1,0,0, 0.05,0.15,0.45,0,0, 0,0,0,1,0] },
  { id:'cold',    label:'Cold',    emoji:'🧊', css:'saturate(0.6) hue-rotate(200deg) brightness(1.15)', matrix:[0.6,0,0.3,0,0.05, 0,0.7,0.2,0,0.05, 0.1,0.1,1.4,0,0.05, 0,0,0,1,0] },
  { id:'pink',    label:'Pink',    emoji:'🩷', css:'sepia(0.2) saturate(2.5) hue-rotate(300deg)',        matrix:[1.5,0,0.3,0,0.05, 0,0.7,0.1,0,0, 0.2,0,0.8,0,0.05, 0,0,0,1,0] },
  { id:'golden',  label:'Golden',  emoji:'✨', css:'sepia(0.6) saturate(2) brightness(1.15)',            matrix:[1.5,0.2,0,0,0.1, 0.1,1.1,0,0,0.05, 0,0,0.4,0,-0.1, 0,0,0,1,0] },
]
const BEAUTY_FILTERS = [
  { id:'smooth',    label:'Smooth',    emoji:'🌟', css:'brightness(1.08) contrast(0.88) saturate(0.9)',    matrix:[0.98,0,0,0,0.04, 0,0.95,0,0,0.04, 0,0,0.95,0,0.04, 0,0,0,1,0] },
  { id:'blush',     label:'Blush',     emoji:'🌸', css:'brightness(1.1) saturate(1.3) hue-rotate(340deg)', matrix:[1.15,0.05,0.05,0,0.04, 0.05,0.9,0.05,0,0.02, 0.05,0,0.82,0,0.02, 0,0,0,1,0] },
  { id:'makeup',    label:'Makeup',    emoji:'💄', css:'contrast(1.1) saturate(1.4) brightness(1.05)',     matrix:[1.1,0.05,0,0,0.02, 0,1.05,0.05,0,0.01, 0,0.05,0.95,0,-0.02, 0,0,0,1,0] },
  { id:'glow',      label:'Glow',      emoji:'💫', css:'brightness(1.2) contrast(0.9) saturate(1.1)',      matrix:[1.0,0,0,0,0.1, 0,1.0,0,0,0.08, 0,0,0.98,0,0.08, 0,0,0,1,0] },
  { id:'porcelain', label:'Porcelain', emoji:'🤍', css:'brightness(1.15) contrast(0.85) saturate(0.75)',   matrix:[0.92,0,0,0,0.1, 0,0.92,0,0,0.08, 0,0,0.9,0,0.1, 0,0,0,1,0] },
  { id:'natural',   label:'Natural',   emoji:'🌿', css:'brightness(1.06) contrast(0.95) saturate(1.1)',    matrix:[1.02,0,0,0,0.02, 0,1.02,0,0,0.02, 0,0,0.98,0,0.01, 0,0,0,1,0] },
]
const ALL_FILTERS = [...NORMAL_FILTERS, ...BEAUTY_FILTERS]

const LAYOUTS = [
  { id:1,     label:'1',    count:1 },
  { id:2,     label:'2',    count:2 },
  { id:3,     label:'3',    count:3 },
  { id:4,     label:'4',    count:4 },
  { id:'2x2', label:'2×2',  count:4, grid:true },
]

const THEMES = [
  { id:'dark',      label:'Classic',  emoji:'🖤', bg:'#1a0f1e',  border:'rgba(244,167,185,0.5)', frameBorder:'rgba(244,167,185,0.3)', footerColor:'rgba(244,167,185,0.85)', footerText:"Deidree's Album ♡",     dateColor:'rgba(255,255,255,0.35)', imgData:null },
  { id:'deidree',   label:'Deidree',  emoji:'🎀', bg:'#2d0a1e',  border:'#ff69b4',               frameBorder:'#ff69b4',               footerColor:'#ff69b4',               footerText:'🎀 Deidree 🎀',           dateColor:'rgba(255,182,193,0.7)',  imgData:null },
  { id:'olivia',    label:'Olivia',   emoji:'💜', bg:'#0d0010',  border:'#9b59b6',               frameBorder:'#6c3483',               footerColor:'#d98ef0',               footerText:'★ brutal ★ good 4 u ★',  dateColor:'rgba(200,150,230,0.6)', imgData:null },
  { id:'ariana',    label:'Ariana',   emoji:'🌙', bg:'#1a000a',  border:'#ff1493',               frameBorder:'#c71585',               footerColor:'#ff69b4',               footerText:'✨ thank u, next ✨',      dateColor:'rgba(255,182,193,0.6)', imgData:null },
  { id:'taylor',    label:'Taylor',   emoji:'🌟', bg:'#0a0505',  border:'#c9a84c',               frameBorder:'#c9a84c',               footerColor:'#f0d060',               footerText:'✦ 1989 ✦ eras tour ✦',   dateColor:'rgba(210,180,100,0.6)', imgData:null },
  { id:'sabrina',   label:'Sabrina',  emoji:'🌻', bg:'#0a1020',  border:'#ffd700',               frameBorder:'#ffd700',               footerColor:'#ffd700',               footerText:'☆ please please please ☆',dateColor:'rgba(255,215,0,0.5)',   imgData:null },
  { id:'loudhouse', label:'Loud',     emoji:'🏠', bg:'#ffffff',  border:'#000000',               frameBorder:'#000000',               footerColor:'#e31c25',               footerText:'★ THE LOUD HOUSE ★',      dateColor:'#555',                  imgData:null, textOnLight:true },
  { id:'pink',      label:'Pink',     emoji:'🌸', bg:'#fff0f5',  border:'#ff9dbb',               frameBorder:'#ffb6cb',               footerColor:'#e8698a',               footerText:'🌸 cute & pretty 🌸',     dateColor:'rgba(200,80,120,0.5)',   imgData:null, textOnLight:true },
  { id:'aesthetic', label:'VSCO',     emoji:'🤍', bg:'#f5f5f0',  border:'#bbb',                  frameBorder:'#ccc',                  footerColor:'#666',                  footerText:'film . memories . us',    dateColor:'rgba(100,100,100,0.5)', imgData:null, textOnLight:true },
]

function applyMatrixFilter(srcCanvas, matrix) {
  const W=srcCanvas.width,H=srcCanvas.height
  const out=document.createElement('canvas'); out.width=W; out.height=H
  const ctx=out.getContext('2d')
  const src=srcCanvas.getContext('2d').getImageData(0,0,W,H)
  const dst=ctx.createImageData(W,H)
  const d=src.data,o=dst.data,m=matrix
  for(let i=0;i<d.length;i+=4){
    const r=d[i],g=d[i+1],b=d[i+2],a=d[i+3]
    o[i]  =clamp(m[0]*r +m[1]*g +m[2]*b +m[3]*a +m[4]*255)
    o[i+1]=clamp(m[5]*r +m[6]*g +m[7]*b +m[8]*a +m[9]*255)
    o[i+2]=clamp(m[10]*r+m[11]*g+m[12]*b+m[13]*a+m[14]*255)
    o[i+3]=a
  }
  ctx.putImageData(dst,0,0); return out
}
function clamp(v){return Math.min(255,Math.max(0,Math.round(v)))}

// Apply brightness/contrast/saturation sliders to a captured dataUrl
function applyAdvancedSliders(dataUrl, brightness, contrast, saturation){
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')

      // draw image first
      ctx.drawImage(img, 0, 0)

      // read pixels
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const d = imageData.data

      const b = brightness / 100   // 0.5 – 1.5
      const c = contrast / 100     // 0.5 – 1.5
      const s = saturation / 100   // 0 – 2

      for(let i = 0; i < d.length; i += 4){
        let r = d[i], g = d[i+1], bl = d[i+2]

        // brightness
        r *= b; g *= b; bl *= b

        // contrast — pivot around 128
        r = (r - 128) * c + 128
        g = (g - 128) * c + 128
        bl = (bl - 128) * c + 128

        // saturation — convert to grayscale then lerp
        const gray = 0.299*r + 0.587*g + 0.114*bl
        r = gray + (r - gray) * s
        g = gray + (g - gray) * s
        bl = gray + (bl - gray) * s

        d[i]   = clamp(r)
        d[i+1] = clamp(g)
        d[i+2] = clamp(bl)
      }

      ctx.putImageData(imageData, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }
    img.src = dataUrl
  })
}

function captureFrame(videoEl,filterObj,mirror){
  const W=videoEl.videoWidth||640,H=videoEl.videoHeight||480
  const raw=document.createElement('canvas'); raw.width=W; raw.height=H
  const rc=raw.getContext('2d')
  if(mirror){rc.translate(W,0);rc.scale(-1,1)}
  rc.drawImage(videoEl,0,0)
  if(mirror)rc.setTransform(1,0,0,1,0,0)
  if(filterObj&&filterObj.matrix)return applyMatrixFilter(raw,filterObj.matrix).toDataURL('image/jpeg',0.92)
  return raw.toDataURL('image/jpeg',0.92)
}

export default function PhotoboothPage(){
  const router=useRouter()
  const supabase=createClient()

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{
      if(!data.session)router.push('/login')
      else fetchRecent()
    })
  },[])

  async function fetchRecent(){
    setRecentLoading(true)
    try{
      const{data}=await supabase.from('photos').select('url,created_at').order('created_at',{ascending:false}).limit(6)
      if(data)setRecentPhotos(data)
    }catch{}
    setRecentLoading(false)
  }

  const [step,          setStep]          = useState('layout')
  const [layout,        setLayout]        = useState(4)
  const [layoutGrid,    setLayoutGrid]    = useState(false)
  const [theme,         setTheme]         = useState('dark')
  const [tab,           setTab]           = useState('filters') // 'filters'|'beauty'|'themes'
  const [filter,        setFilter]        = useState('normal')
  const [shots,         setShots]         = useState([])
  const [current,       setCurrent]       = useState(0)
  const [countdown,     setCountdown]     = useState(null)
  const [flashing,      setFlashing]      = useState(false)
  const [stripUrl,      setStripUrl]      = useState(null)
  const [caption,       setCaption]       = useState('')
  const [uploading,     setUploading]     = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [facingMode,    setFacingMode]    = useState('user')
  const [processing,    setProcessing]    = useState(false)
  const [flashOn,       setFlashOn]       = useState(false)
  const [camAllowed,    setCamAllowed]    = useState(true)
  const [timerSecs,     setTimerSecs]     = useState(3)  // 3 | 5 | 10
  const [stickerMode,   setStickerMode]   = useState(false)
  const [stickerShotIdx,setStickerShotIdx]= useState(0)
  const [showAdvanced,  setShowAdvanced]  = useState(false)
  const [brightness,    setBrightness]    = useState(100)
  const [contrast,      setContrast]      = useState(100)
  const [saturation,    setSaturation]    = useState(100)
  const [filterInt,     setFilterInt]     = useState(100)
  const [beautyMode,    setBeautyMode]    = useState(0)
  const [recentPhotos,  setRecentPhotos]  = useState([])
  const [recentLoading, setRecentLoading] = useState(false)


  const videoRef   = useRef(null)
  const streamRef  = useRef(null)
  const overlayRef = useRef(null)

  const currentFilter = ALL_FILTERS.find(f=>f.id===filter)||ALL_FILTERS[0]
  const currentTheme  = THEMES.find(t=>t.id===theme)||THEMES[0]

  // combine base filter + advanced slider adjustments
  const advancedCss = `brightness(${brightness/100}) contrast(${contrast/100}) saturate(${saturation/100})`
  const baseFilterCss = currentFilter.id==='normal' ? 'none' : currentFilter.css
  const combinedCss = baseFilterCss==='none' ? advancedCss : `${baseFilterCss} brightness(${brightness/100}) contrast(${contrast/100}) saturate(${saturation/100})`

  function resetAdvanced(){ setBrightness(100); setContrast(100); setSaturation(100); setFilterInt(100); setBeautyMode(0) }

  async function startCamera(facing){
    const mode=facing??facingMode
    try{
      streamRef.current?.getTracks().forEach(t=>t.stop())
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:mode}},audio:false})
      streamRef.current=stream
      const vid=videoRef.current
      vid.setAttribute('autoplay',''); vid.setAttribute('muted',''); vid.setAttribute('playsinline','')
      vid.muted=true; vid.srcObject=stream
      await new Promise(r=>setTimeout(r,150))
      await vid.play()
      setCamAllowed(true)
    }catch(err){
      setCamAllowed(false)
      console.log('Camera error:',err.message)
    }
  }

  async function switchCamera(){
    const next=facingMode==='user'?'environment':'user'
    setFacingMode(next); await startCamera(next)
  }

  function stopCamera(){streamRef.current?.getTracks().forEach(t=>t.stop())}

  useEffect(()=>{
    if(step==='camera')startCamera(facingMode)
    else stopCamera()
    return()=>stopCamera()
  },[step])

  function triggerFlash(){
    if(!flashOn||!overlayRef.current)return
    overlayRef.current.style.opacity='1'
    setTimeout(()=>{if(overlayRef.current)overlayRef.current.style.opacity='0'},120)
  }

  async function handleCapture(){
    if(processing)return
    setProcessing(true)
    for(let c=timerSecs;c>=1;c--){setCountdown(c);await wait(1000)}
    setCountdown('📸');await wait(300)
    triggerFlash()
    const mirror=facingMode==='user'

    // Step 1: capture with base color matrix filter
    let dataUrl=captureFrame(videoRef.current,currentFilter,mirror)

    // Step 2: apply advanced slider adjustments (brightness/contrast/saturation)
    // only if any slider is not at default
    if(brightness!==100||contrast!==100||saturation!==100){
      dataUrl = await applyAdvancedSliders(dataUrl, brightness, contrast, saturation)
    }

    setFlashing(true);setTimeout(()=>setFlashing(false),200)
    setCountdown(null)
    const newShots=[...shots]
    newShots[current]={dataUrl,filterId:filter}
    setShots(newShots)
    if(current+1<layout)setCurrent(current+1)
    else setStep('review')
    setProcessing(false)
  }

  function retakeShot(idx){setCurrent(idx);setStep('camera')}
  function openStickers(idx){setStickerShotIdx(idx);setStickerMode(true)}
  function onStickerDone(newDataUrl){
    const updated=[...shots]
    updated[stickerShotIdx]={...updated[stickerShotIdx],dataUrl:newDataUrl}
    setShots(updated);setStickerMode(false)
  }

  async function generateStrip(){
    const t=currentTheme
    const firstShot=shots[0]
    let shotW=640,shotH=480
    if(firstShot){const ti=await loadImage(firstShot.dataUrl);shotW=ti.naturalWidth;shotH=ti.naturalHeight}
    const shotRatio=shotH/shotW
    const FRAME_W=layoutGrid?180:360
    const FRAME_H=layoutGrid?180:Math.round(FRAME_W*shotRatio)
    const PAD=28,FOOTER=80,BORDER=8
    let STRIP_W,STRIP_H
    if(layoutGrid){STRIP_W=PAD+FRAME_W+PAD/2+FRAME_W+PAD;STRIP_H=PAD+FRAME_H+PAD/2+FRAME_H+PAD+FOOTER}
    else{STRIP_W=FRAME_W+PAD*2;STRIP_H=PAD+(FRAME_H+PAD)*layout+FOOTER}
    const canvas=document.createElement('canvas')
    canvas.width=STRIP_W;canvas.height=STRIP_H
    const ctx=canvas.getContext('2d')
    ctx.fillStyle=t.bg;ctx.fillRect(0,0,STRIP_W,STRIP_H)
    if(t.imgData){
      try{
        const ti=await loadImage(t.imgData)
        const tw=Math.round(STRIP_W*0.25),ratio=ti.naturalHeight/ti.naturalWidth,th=Math.round(tw*ratio)
        ctx.save();ctx.globalAlpha=0.2;ctx.drawImage(ti,STRIP_W-tw-8,STRIP_H-FOOTER-th-8,tw,th);ctx.globalAlpha=1;ctx.restore()
        const sw=Math.round(STRIP_W*0.15),sh=Math.round(sw*ratio)
        ctx.save();ctx.globalAlpha=0.15;ctx.drawImage(ti,8,8,sw,sh);ctx.globalAlpha=1;ctx.restore()
      }catch(e){}
    }
    ctx.strokeStyle=t.border;ctx.lineWidth=BORDER;ctx.strokeRect(BORDER/2,BORDER/2,STRIP_W-BORDER,STRIP_H-BORDER)
    ctx.strokeStyle=t.border;ctx.lineWidth=1.5;ctx.globalAlpha=0.5;ctx.setLineDash([6,4])
    ctx.strokeRect(BORDER+4,BORDER+4,STRIP_W-(BORDER+4)*2,STRIP_H-(BORDER+4)*2)
    ctx.setLineDash([]);ctx.globalAlpha=1
    ctx.fillStyle=t.border;ctx.globalAlpha=0.15;ctx.fillRect(0,0,STRIP_W,PAD);ctx.fillRect(0,STRIP_H-FOOTER,STRIP_W,FOOTER)
    ctx.fillRect(0,PAD,PAD,STRIP_H-PAD-FOOTER);ctx.fillRect(STRIP_W-PAD,PAD,PAD,STRIP_H-PAD-FOOTER);ctx.globalAlpha=1
    const images=await Promise.all(shots.slice(0,layout).map(s=>loadImage(s.dataUrl)))
    function drawContain(ctx,img,x,y,w,h){
      const ir=img.naturalWidth/img.naturalHeight,fr=w/h
      let dw,dh,dx,dy
      if(ir>fr){dw=w;dh=w/ir;dx=x;dy=y+(h-dh)/2}
      else{dh=h;dw=h*ir;dx=x+(w-dw)/2;dy=y}
      ctx.drawImage(img,dx,dy,dw,dh)
    }
    if(layoutGrid){
      const pos=[[PAD,PAD],[PAD+FRAME_W+PAD/2,PAD],[PAD,PAD+FRAME_H+PAD/2],[PAD+FRAME_W+PAD/2,PAD+FRAME_H+PAD/2]]
      for(let i=0;i<4;i++){
        const img=images[i];if(!img)continue
        const[x,y]=pos[i]
        ctx.save();ctx.beginPath();ctx.rect(x,y,FRAME_W,FRAME_H);ctx.clip()
        ctx.fillStyle='#2c1f2e';ctx.fillRect(x,y,FRAME_W,FRAME_H)
        ctx.filter='none';drawContain(ctx,img,x,y,FRAME_W,FRAME_H);ctx.restore()
        ctx.strokeStyle=t.frameBorder;ctx.lineWidth=1.5;ctx.strokeRect(x,y,FRAME_W,FRAME_H)
      }
    }else{
      for(let i=0;i<layout;i++){
        const img=images[i];if(!img)continue
        const x=PAD,y=PAD+i*(FRAME_H+PAD)
        ctx.save();ctx.beginPath();ctx.rect(x,y,FRAME_W,FRAME_H);ctx.clip()
        ctx.fillStyle='#2c1f2e';ctx.fillRect(x,y,FRAME_W,FRAME_H)
        ctx.filter='none';drawContain(ctx,img,x,y,FRAME_W,FRAME_H);ctx.restore()
        ctx.strokeStyle=t.frameBorder;ctx.lineWidth=1.5;ctx.strokeRect(x,y,FRAME_W,FRAME_H)
      }
    }
    const fm=STRIP_H-FOOTER/2
    ctx.fillStyle=t.footerColor;ctx.font='italic bold 18px Georgia, serif';ctx.textAlign='center'
    ctx.fillText(t.footerText,STRIP_W/2,fm-8)
    const date=new Date().toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric',timeZone:'Asia/Manila'})
    ctx.fillStyle=t.dateColor;ctx.font='13px sans-serif';ctx.fillText(date,STRIP_W/2,fm+14)
    return canvas.toDataURL('image/jpeg',0.93)
  }

  function loadImage(src){
    return new Promise((res,rej)=>{const img=new Image();img.onload=()=>res(img);img.onerror=rej;img.src=src})
  }

  async function handleGenerateStrip(){const url=await generateStrip();setStripUrl(url);setStep('strip')}

  function downloadStrip(){
    const a=document.createElement('a');a.href=stripUrl;a.download=`deidree_booth_${Date.now()}.jpg`;a.click()
  }

  function dataURLtoBlob(dataUrl){
    const[header,base64]=dataUrl.split(',')
    const mime=header.match(/:(.*?);/)[1]
    const binary=atob(base64);const arr=new Uint8Array(binary.length)
    for(let i=0;i<binary.length;i++)arr[i]=binary.charCodeAt(i)
    return new Blob([arr],{type:mime})
  }

  async function saveStrip(){
    setUploading(true)
    try{
      const blob=dataURLtoBlob(stripUrl)
      const compressed=await imageCompression(blob,{maxSizeMB:0.6,maxWidthOrHeight:1400,useWebWorker:true,fileType:'image/jpeg',initialQuality:0.85})
      const path=`strip_${Date.now()}.jpg`
      const{error:upErr}=await supabase.storage.from('photos').upload(path,compressed,{contentType:'image/jpeg'})
      if(upErr)throw upErr
      const{data}=supabase.storage.from('photos').getPublicUrl(path)
      const{data:{user}}=await supabase.auth.getUser()
      const uploadedAt=new Date().toISOString()
      await supabase.from('photos').insert({url:data.publicUrl,caption:caption||null,uploaded_by:user.id,created_at:uploadedAt})
      try{await fetch('/api/notify',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({photoUrl:data.publicUrl,caption:caption||`${currentTheme.emoji} ${currentTheme.label} strip 🎞`,uploadedAt})})}
      catch{}
      setSaved(true)
      fetchRecent()
    }catch(e){alert('Save failed: '+e.message)}
    setUploading(false)
  }

  function resetAll(){
    setStep('layout');setShots([]);setCurrent(0);setStripUrl(null)
    setCaption('');setSaved(false);setFilter('normal');setProcessing(false)
    setLayoutGrid(false);setStickerMode(false);setTab('filters')
  }

  function wait(ms){return new Promise(r=>setTimeout(r,ms))}
  async function handleLogout(){await supabase.auth.signOut();router.push('/login')}

  // ── CSS injected via style tag ────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
    .pb-app *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
    .pb-app{font-family:'DM Sans',sans-serif;min-height:100vh;min-height:100dvh;
      background:linear-gradient(135deg,#0d0520 0%,#1a0840 35%,#2d1060 65%,#1a0840 100%);
      position:relative;overflow-x:hidden;padding-bottom:20px;}
    .pb-app::before{content:'';position:fixed;inset:0;
      background:radial-gradient(ellipse at 15% 15%,rgba(139,92,246,0.12) 0%,transparent 55%),
                 radial-gradient(ellipse at 85% 85%,rgba(236,72,153,0.08) 0%,transparent 55%);
      pointer-events:none;z-index:0;}
    .pb-wrap{position:relative;z-index:1;max-width:480px;margin:0 auto;padding:0 16px;}

    .glass{background:rgba(255,255,255,0.07);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
      border:1px solid rgba(255,255,255,0.12);border-radius:20px;}
    .glass-sm{background:rgba(255,255,255,0.06);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
      border:1px solid rgba(255,255,255,0.1);border-radius:14px;}
    .glow{box-shadow:0 0 0 1px rgba(139,92,246,0.35),0 0 24px rgba(139,92,246,0.12);}
    .glow-pink{box-shadow:0 0 0 1px rgba(236,72,153,0.35),0 0 24px rgba(236,72,153,0.12);}

    .pb-header{display:flex;justify-content:space-between;align-items:center;padding:16px 16px 12px;}
    .pb-logo{font-size:17px;font-weight:600;color:#fff;letter-spacing:-0.3px;}
    .pb-logo em{color:#c084fc;font-style:normal;}
    .pb-signout{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:20px;
      padding:6px 14px;color:rgba(255,255,255,0.6);font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;}

    .pb-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(139,92,246,0.2);
      border:1px solid rgba(139,92,246,0.4);border-radius:20px;padding:5px 12px;
      font-size:12px;font-weight:500;color:#c084fc;}
    .pb-badge .dot{width:6px;height:6px;border-radius:50%;background:#a78bfa;
      box-shadow:0 0 6px rgba(167,139,250,0.8);animation:blink 1.5s ease-in-out infinite;}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}

    .pb-tabs{display:flex;gap:3px;padding:3px;border-radius:14px;background:rgba(0,0,0,0.25);margin-bottom:14px;}
    .pb-tab{flex:1;padding:8px 4px;text-align:center;font-size:11px;font-weight:500;border-radius:10px;
      cursor:pointer;color:rgba(255,255,255,0.35);transition:all 0.2s;border:none;background:transparent;
      font-family:'DM Sans',sans-serif;}
    .pb-tab.on{background:rgba(139,92,246,0.25);color:#c084fc;border:1px solid rgba(139,92,246,0.3);}

    .cam-outer{position:relative;border-radius:24px;overflow:hidden;width:100%;
      box-shadow:0 0 0 1px rgba(139,92,246,0.3),0 0 40px rgba(139,92,246,0.1),inset 0 1px 0 rgba(255,255,255,0.08);
      background:#0a0010;margin-bottom:14px;}
    .cam-video{width:100%;height:100%;object-fit:cover;display:block;}
    .cam-denied{display:flex;flex-direction:column;align-items:center;justify-content:center;
      gap:10px;padding:40px 24px;min-height:240px;}
    .cam-icon-wrap{width:56px;height:56px;border-radius:50%;
      background:radial-gradient(circle,rgba(139,92,246,0.3),rgba(139,92,246,0.08));
      border:1px solid rgba(139,92,246,0.5);display:flex;align-items:center;justify-content:center;font-size:24px;
      box-shadow:0 0 20px rgba(139,92,246,0.3);}
    .cam-denied-title{color:rgba(255,255,255,0.9);font-size:14px;font-weight:600;}
    .cam-denied-sub{color:rgba(255,255,255,0.4);font-size:11px;text-align:center;line-height:1.5;max-width:200px;}
    .try-btn{background:linear-gradient(135deg,#7c3aed,#db2777);border:none;border-radius:20px;
      padding:9px 20px;color:#fff;font-size:13px;font-weight:500;cursor:pointer;
      box-shadow:0 0 16px rgba(139,92,246,0.4);font-family:'DM Sans',sans-serif;margin-top:4px;}
    .cam-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 65%,rgba(13,5,32,0.7));
      pointer-events:none;}
    .cam-controls{position:absolute;top:10px;right:10px;display:flex;gap:6px;}
    .cam-btn{width:32px;height:32px;border-radius:10px;background:rgba(0,0,0,0.5);
      backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.15);
      display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;}
    .cam-btn.flash-on{background:rgba(255,215,0,0.2);border-color:rgba(255,215,0,0.5);}
    .timer-btns{display:flex;gap:4px;}
    .timer-btn{padding:5px 9px;border-radius:8px;background:rgba(0,0,0,0.5);
      backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.12);
      color:rgba(255,255,255,0.55);font-size:11px;font-weight:600;cursor:pointer;
      font-family:'DM Sans',sans-serif;transition:all 0.2s;}
    .timer-btn.on{background:rgba(139,92,246,0.35);border-color:rgba(139,92,246,0.7);
      color:#c084fc;box-shadow:0 0 8px rgba(139,92,246,0.3);}
    .shot-info{position:absolute;bottom:10px;left:12px;background:rgba(0,0,0,0.5);
      backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.1);border-radius:20px;
      padding:4px 10px;font-size:11px;color:rgba(255,255,255,0.7);font-family:'DM Sans',sans-serif;}
    .cam-countdown{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
      font-size:88px;color:#fff;text-shadow:0 0 30px rgba(139,92,246,0.8);
      background:rgba(0,0,0,0.3);font-weight:700;}

    .filter-scroll{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;scrollbar-width:none;}
    .filter-scroll::-webkit-scrollbar{display:none;}
    .filter-chip{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;}
    .filter-icon{width:54px;height:44px;border-radius:12px;
      background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);
      display:flex;align-items:center;justify-content:center;font-size:16px;transition:all 0.2s;}
    .filter-chip.on .filter-icon{border-color:rgba(139,92,246,0.8);
      box-shadow:0 0 14px rgba(139,92,246,0.35);background:rgba(139,92,246,0.18);}
    .filter-name{font-size:10px;color:rgba(255,255,255,0.4);font-weight:500;font-family:'DM Sans',sans-serif;}
    .filter-chip.on .filter-name{color:#c084fc;}

    .theme-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;}
    .theme-card{border-radius:14px;padding:10px 6px;cursor:pointer;display:flex;flex-direction:column;
      align-items:center;gap:3px;transition:all 0.2s;min-height:62px;justify-content:center;}
    .theme-label{font-size:10px;font-weight:500;font-family:'DM Sans',sans-serif;margin-top:2px;}

    .shot-dots{display:flex;gap:8px;justify-content:center;margin:12px 0;}
    .shot-dot{width:48px;height:48px;border-radius:12px;border:1.5px solid rgba(255,255,255,0.1);
      background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;
      font-size:13px;color:rgba(255,255,255,0.2);overflow:hidden;transition:all 0.2s;}
    .shot-dot.active{border-color:rgba(139,92,246,0.7);box-shadow:0 0 12px rgba(139,92,246,0.3);}
    .shot-dot.done{border-color:rgba(139,92,246,0.4);}
    .shot-dot img{width:100%;height:100%;object-fit:cover;}

    .capture-wrap{display:flex;align-items:center;justify-content:center;padding:8px 0 16px;}
    .capture-btn{width:68px;height:68px;border-radius:50%;
      background:linear-gradient(135deg,#7c3aed,#db2777);border:none;cursor:pointer;
      position:relative;display:flex;align-items:center;justify-content:center;
      box-shadow:0 0 0 5px rgba(139,92,246,0.18),0 0 32px rgba(139,92,246,0.35);
      font-family:'DM Sans',sans-serif;}
    .capture-ring{position:absolute;inset:-6px;border-radius:50%;
      border:2px solid rgba(139,92,246,0.45);animation:capPulse 2s ease-in-out infinite;}
    .capture-core{width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,0.95);}
    @keyframes capPulse{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.06);opacity:1}}

    .adv-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:100;backdrop-filter:blur(4px);}
    .adv-sheet{position:fixed;bottom:0;left:0;right:0;z-index:101;
      background:rgba(18,8,40,0.97);border-radius:24px 24px 0 0;
      border-top:1px solid rgba(139,92,246,0.3);border-left:1px solid rgba(139,92,246,0.15);border-right:1px solid rgba(139,92,246,0.15);
      padding:0 20px 40px;box-shadow:0 -8px 40px rgba(139,92,246,0.2);
      animation:slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1);}
    @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
    .adv-handle{width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,0.2);margin:12px auto 20px;}
    .adv-title{font-size:16px;font-weight:600;color:#fff;margin-bottom:4px;}
    .adv-sub{font-size:12px;color:rgba(255,255,255,0.35);margin-bottom:20px;}
    .adv-slider-row{margin-bottom:16px;}
    .adv-slider-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
    .adv-slider-label{font-size:12px;font-weight:500;color:rgba(255,255,255,0.7);}
    .adv-slider-val{font-size:12px;font-weight:600;color:#c084fc;min-width:32px;text-align:right;}
    .adv-slider{width:100%;height:4px;border-radius:2px;outline:none;cursor:pointer;
      background:linear-gradient(to right,#7c3aed var(--val),rgba(255,255,255,0.1) var(--val));
      -webkit-appearance:none;appearance:none;border:none;}
    .adv-slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;
      background:linear-gradient(135deg,#a78bfa,#ec4899);box-shadow:0 0 8px rgba(139,92,246,0.6);cursor:pointer;}
    .adv-slider::-moz-range-thumb{width:18px;height:18px;border-radius:50%;border:none;
      background:linear-gradient(135deg,#a78bfa,#ec4899);box-shadow:0 0 8px rgba(139,92,246,0.6);cursor:pointer;}
    .adv-reset{width:100%;padding:13px;border:none;border-radius:14px;margin-top:4px;
      background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;font-size:14px;
      font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;
      box-shadow:0 4px 20px rgba(139,92,246,0.35);letter-spacing:0.01em;}
    .pro-tips{margin-top:16px;padding:14px;border-radius:14px;
      background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.2);}
    .pro-tips-title{font-size:11px;font-weight:600;color:#a78bfa;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;}
    .pro-tip{font-size:11px;color:rgba(255,255,255,0.45);line-height:1.6;padding-left:10px;position:relative;}
    .pro-tip::before{content:'✦';position:absolute;left:0;color:#7c3aed;font-size:8px;top:2px;}

    .adv-settings-btn{width:32px;height:32px;border-radius:10px;background:rgba(139,92,246,0.2);
      border:1px solid rgba(139,92,246,0.4);display:flex;align-items:center;justify-content:center;
      font-size:14px;cursor:pointer;box-shadow:0 0 10px rgba(139,92,246,0.2);}

    .timer-btns{display:flex;gap:4px;}
    .timer-btn{height:32px;padding:0 9px;border-radius:10px;background:rgba(0,0,0,0.5);
      backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.15);
      color:rgba(255,255,255,0.7);font-size:11px;font-weight:600;cursor:pointer;
      font-family:'DM Sans',sans-serif;transition:all 0.2s;}
    .timer-btn.on{background:rgba(139,92,246,0.4);border-color:rgba(139,92,246,0.7);
      color:#fff;box-shadow:0 0 8px rgba(139,92,246,0.4);}

    .recent-section{margin-top:8px;padding:16px;border-radius:20px;
      background:rgba(255,255,255,0.05);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
      border:1px solid rgba(255,255,255,0.1);box-shadow:0 4px 24px rgba(0,0,0,0.3);}
    .recent-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
    .recent-title{font-size:13px;font-weight:600;color:rgba(255,255,255,0.8);display:flex;align-items:center;gap:6px;}
    .recent-title::before{content:'';width:3px;height:14px;border-radius:2px;
      background:linear-gradient(to bottom,#7c3aed,#db2777);display:inline-block;}
    .recent-view-all{font-size:11px;color:#a78bfa;cursor:pointer;font-weight:500;
      background:none;border:none;font-family:'DM Sans',sans-serif;}
    .recent-scroll{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;}
    .recent-scroll::-webkit-scrollbar{display:none;}
    .recent-thumb{flex-shrink:0;width:72px;height:72px;border-radius:12px;overflow:hidden;
      border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);
      cursor:pointer;position:relative;transition:all 0.2s;}
    .recent-thumb:hover{border-color:rgba(139,92,246,0.5);box-shadow:0 0 12px rgba(139,92,246,0.25);}
    .recent-thumb img{width:100%;height:100%;object-fit:cover;display:block;}
    .recent-empty{display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px;width:100%;}
    .recent-empty-icon{font-size:24px;opacity:0.3;}
    .recent-empty-text{font-size:11px;color:rgba(255,255,255,0.25);text-align:center;}
    .recent-shimmer{flex-shrink:0;width:72px;height:72px;border-radius:12px;
      background:linear-gradient(90deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 100%);
      background-size:200% 100%;animation:shimmer 1.5s infinite;}
    @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

    .review-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;}
    .review-card{border-radius:16px;overflow:hidden;border:1px solid rgba(139,92,246,0.2);
      background:rgba(0,0,0,0.3);display:flex;flex-direction:column;}
    .review-img{width:100%;height:auto;object-fit:contain;display:block;background:#0a0010;}
    .review-actions{display:flex;}
    .review-btn{flex:1;padding:9px 6px;font-size:11px;font-weight:500;border:none;cursor:pointer;
      font-family:'DM Sans',sans-serif;color:#fff;}
    .review-btn.retake{background:rgba(139,92,246,0.7);}
    .review-btn.sticker{background:rgba(236,72,153,0.7);border-left:1px solid rgba(0,0,0,0.2);}
    .review-shot-num{padding:4px 0;text-align:center;font-size:10px;
      color:rgba(255,255,255,0.35);background:rgba(0,0,0,0.4);font-family:'DM Sans',sans-serif;}

    .section-label{font-size:10px;font-weight:600;letter-spacing:0.08em;
      color:rgba(139,92,246,0.7);text-transform:uppercase;margin-bottom:8px;}

    .strip-preview-img{width:100%;max-width:320px;height:auto;border-radius:16px;display:block;margin:0 auto;
      box-shadow:0 0 0 1px rgba(139,92,246,0.3),0 8px 40px rgba(0,0,0,0.6);}

    .caption-input{width:100%;padding:13px 16px;border-radius:14px;font-size:16px;
      background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);
      color:#fff;outline:none;font-family:'DM Sans',sans-serif;margin-bottom:12px;}
    .caption-input::placeholder{color:rgba(255,255,255,0.25);}

    .btn-row{display:flex;gap:10px;width:100%;}
    .btn-primary{flex:1;padding:15px;border:none;border-radius:14px;
      background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;font-size:15px;
      font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;
      box-shadow:0 4px 20px rgba(139,92,246,0.35);}
    .btn-secondary{flex:1;padding:15px;border-radius:14px;
      background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);
      color:rgba(255,255,255,0.7);font-size:15px;cursor:pointer;font-family:'DM Sans',sans-serif;}

    .success-msg{width:100%;padding:14px;border-radius:14px;text-align:center;font-size:14px;
      color:#c084fc;background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.25);
      margin-bottom:12px;font-family:'DM Sans',sans-serif;}

    .layout-grid{display:flex;gap:8px;margin-bottom:20px;}
    .layout-card{flex:1;border-radius:14px;padding:12px 6px;cursor:pointer;
      background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.08);
      display:flex;flex-direction:column;align-items:center;gap:6px;transition:all 0.2s;}
    .layout-card.on{border-color:rgba(139,92,246,0.7);background:rgba(139,92,246,0.12);
      box-shadow:0 0 16px rgba(139,92,246,0.2);}
    .layout-frames{display:flex;flex-direction:column;gap:3px;width:36px;min-height:60px;justify-content:center;}
    .layout-frame{width:100%;height:13px;border-radius:2px;background:rgba(167,139,250,0.3);}
    .layout-num{font-size:10px;color:rgba(255,255,255,0.5);font-family:'DM Sans',sans-serif;font-weight:500;}
    .layout-card.on .layout-num{color:#c084fc;}

    .page-title{font-size:22px;font-weight:600;color:#fff;text-align:center;margin-bottom:6px;letter-spacing:-0.3px;}
    .page-sub{font-size:13px;color:rgba(255,255,255,0.4);text-align:center;margin-bottom:20px;}
  `

  const currentTabFilters = tab === 'beauty' ? BEAUTY_FILTERS : NORMAL_FILTERS

  return (
    <div className="pb-app">
      <style>{css}</style>

      {/* flash overlay */}
      {flashing && <div style={{position:'fixed',inset:0,background:'#fff',opacity:0.8,zIndex:9999,pointerEvents:'none'}}/>}
      <div ref={overlayRef} style={{position:'fixed',inset:0,background:'#fff',opacity:0,zIndex:9998,pointerEvents:'none',transition:'opacity 0.05s'}}/>

      {/* ── HEADER ── */}
      <div className="pb-header">
        <div className="pb-logo">📷 <em>Deidree's</em> Booth</div>
        <button className="pb-signout" onClick={handleLogout}>Sign out</button>
      </div>

      <div className="pb-wrap">

        {/* ── LAYOUT PICKER ── */}
        {step === 'layout' && (
          <>
            <p className="page-title">Choose Layout</p>
            <p className="page-sub">How many poses? Pick a theme too 🌸</p>

            <div className="layout-grid">
              {LAYOUTS.map(l => (
                <div key={l.id} className={`layout-card${(layoutGrid?l.grid:(layout===l.count&&!l.grid))?' on':''}`}
                  onClick={()=>{setLayout(l.count);setLayoutGrid(!!l.grid)}}>
                  <div className="layout-frames">
                    {l.grid
                      ? <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'3px',width:'36px'}}>
                          {[0,1,2,3].map(i=><div key={i} style={{height:'13px',borderRadius:'2px',background:'rgba(167,139,250,0.3)'}}/>)}
                        </div>
                      : [...Array(l.count)].map((_,i)=><div key={i} className="layout-frame"/>)
                    }
                  </div>
                  <div className="layout-num">{l.label}</div>
                </div>
              ))}
            </div>

            <p className="section-label">🎨 Strip Theme</p>
            <div className="theme-grid">
              {THEMES.map(t=>(
                <div key={t.id} className="theme-card"
                  style={{background:t.bg,border:theme===t.id?`2px solid ${t.border}`:`1px solid ${t.border}30`,boxShadow:theme===t.id?`0 0 14px ${t.border}50`:'none'}}
                  onClick={()=>setTheme(t.id)}>
                  <span style={{fontSize:'20px'}}>{t.emoji}</span>
                  <span className="theme-label" style={{color:t.textOnLight?'#333':'rgba(255,255,255,0.7)'}}>{t.label}</span>
                </div>
              ))}
            </div>

            <button className="btn-primary" style={{width:'100%'}} onClick={()=>{setCurrent(0);setShots([]);setStep('camera')}}>
              Next →
            </button>
          </>
        )}

        {/* ── CAMERA ── */}
        {step === 'camera' && (
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
              <div className="pb-badge">
                <span className="dot"/>
                Shot {current+1} of {layout}
              </div>
              <span style={{fontSize:'12px',color:'rgba(255,255,255,0.4)'}}>{currentTheme.emoji} {currentTheme.label}</span>
            </div>

            {/* camera box */}
            <div className="cam-outer">
              {camAllowed
                ? <video ref={videoRef} className="cam-video"
                    style={{filter:combinedCss,
                            transform:facingMode==='user'?'scaleX(-1)':'scaleX(1)',
                            aspectRatio:'4/3'}}
                    playsInline autoPlay muted/>
                : <div className="cam-denied">
                    <div className="cam-icon-wrap">📷</div>
                    <div className="cam-denied-title">Camera Access Denied</div>
                    <div className="cam-denied-sub">iPhone: Settings → Safari → Camera → Allow</div>
                    <button className="try-btn" onClick={()=>startCamera(facingMode)}>Try Again</button>
                  </div>
              }
              <div className="cam-overlay"/>
              <div className="cam-controls">
                <div className="timer-btns">
                  {[3,5,10].map(t=>(
                    <button key={t} className={`timer-btn${timerSecs===t?' on':''}`} onClick={()=>setTimerSecs(t)}>
                      {t}s
                    </button>
                  ))}
                </div>
                <div className={`cam-btn${flashOn?' flash-on':''}`} onClick={()=>setFlashOn(f=>!f)}>⚡</div>
                <div className="cam-btn" onClick={switchCamera} style={{opacity:countdown!==null?0.5:1}}>🔄</div>
                <div className="adv-settings-btn" onClick={()=>setShowAdvanced(true)}>⚙️</div>
              </div>
              {camAllowed && <div className="shot-info">Shot {current+1}/{layout} · {currentFilter.label}</div>}
              {countdown!==null && <div className="cam-countdown">{countdown}</div>}
            </div>

            {/* tabs */}
            <div className="pb-tabs">
              <button className={`pb-tab${tab==='filters'?' on':''}`} onClick={()=>setTab('filters')}>Filters</button>
              <button className={`pb-tab${tab==='beauty'?' on':''}`} onClick={()=>setTab('beauty')}>Beauty</button>
              <button className={`pb-tab${tab==='themes'?' on':''}`} onClick={()=>setTab('themes')}>Themes</button>
            </div>

            {/* filter/beauty row */}
            {(tab==='filters'||tab==='beauty') && (
              <div className="filter-scroll" style={{marginBottom:'12px'}}>
                {currentTabFilters.map(f=>(
                  <div key={f.id} className={`filter-chip${filter===f.id?' on':''}`} onClick={()=>setFilter(f.id)}>
                    <div className="filter-icon">{f.emoji}</div>
                    <div className="filter-name">{f.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* themes tab */}
            {tab==='themes' && (
              <div className="theme-grid" style={{marginBottom:'12px'}}>
                {THEMES.map(t=>(
                  <div key={t.id} className="theme-card"
                    style={{background:t.bg,border:theme===t.id?`2px solid ${t.border}`:`1px solid ${t.border}30`,boxShadow:theme===t.id?`0 0 14px ${t.border}50`:'none'}}
                    onClick={()=>setTheme(t.id)}>
                    <span style={{fontSize:'18px'}}>{t.emoji}</span>
                    <span className="theme-label" style={{color:t.textOnLight?'#333':'rgba(255,255,255,0.7)'}}>{t.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* shot progress dots */}
            <div className="shot-dots">
              {[...Array(layout)].map((_,i)=>(
                <div key={i} className={`shot-dot${i===current?' active':''}${shots[i]?' done':''}`}>
                  {shots[i]?<img src={shots[i].dataUrl} alt=""/>:i+1}
                </div>
              ))}
            </div>

            {/* capture button */}
            <div className="capture-wrap">
              <button className="capture-btn" onClick={handleCapture} disabled={countdown!==null||processing||!camAllowed}
                style={{opacity:(countdown!==null||processing||!camAllowed)?0.5:1}}>
                <div className="capture-ring"/>
                <div className="capture-core"/>
              </button>
            </div>

            {/* ── ADVANCED CONTROLS BOTTOM SHEET ── */}
            {showAdvanced && <>
              <div className="adv-backdrop" onClick={()=>setShowAdvanced(false)}/>
              <div className="adv-sheet">
                <div className="adv-handle"/>
                <div className="adv-title">⚙️ Advanced Controls</div>
                <div className="adv-sub">Fine-tune your camera settings</div>

                {[
                  { label:'Brightness', val:brightness, set:setBrightness, min:50,  max:150, icon:'☀️' },
                  { label:'Contrast',   val:contrast,   set:setContrast,   min:50,  max:150, icon:'◑'  },
                  { label:'Saturation', val:saturation, set:setSaturation, min:0,   max:200, icon:'🎨' },
                  { label:'Filter Intensity', val:filterInt, set:setFilterInt, min:0, max:100, icon:'✨' },
                  { label:'Beauty Mode', val:beautyMode, set:setBeautyMode, min:0,  max:100, icon:'💄' },
                ].map(({label,val,set,min,max,icon})=>(
                  <div key={label} className="adv-slider-row">
                    <div className="adv-slider-top">
                      <span className="adv-slider-label">{icon} {label}</span>
                      <span className="adv-slider-val">{val}</span>
                    </div>
                    <input
                      type="range" className="adv-slider"
                      min={min} max={max} value={val}
                      style={{'--val':`${((val-min)/(max-min))*100}%`}}
                      onChange={e=>set(Number(e.target.value))}
                    />
                  </div>
                ))}

                <button className="adv-reset" onClick={resetAdvanced}>
                  ↺ Reset All Settings
                </button>

                <div className="pro-tips">
                  <div className="pro-tips-title">Pro Tips</div>
                  <div className="pro-tip">Lower brightness + raise contrast for dramatic night shots</div>
                  <div className="pro-tip">Max beauty mode + soft filter = flawless selfie</div>
                  <div className="pro-tip">Warm filter + golden saturation = aesthetic glow</div>
                  <div className="pro-tip">B&W + high contrast = moody editorial look</div>
                </div>
              </div>
            </>}
          </>
        )}

        {/* ── REVIEW ── */}
        {step==='review' && !stickerMode && (
          <>
            <p className="page-title">Review Shots</p>
            <p className="page-sub">Tap Stickers to decorate! 🎨</p>

            {/* theme switcher */}
            <p className="section-label">🎨 Strip Theme</p>
            <div className="theme-grid">
              {THEMES.map(t=>(
                <div key={t.id} className="theme-card"
                  style={{background:t.bg,border:theme===t.id?`2px solid ${t.border}`:`1px solid ${t.border}30`,boxShadow:theme===t.id?`0 0 14px ${t.border}50`:'none'}}
                  onClick={()=>setTheme(t.id)}>
                  <span style={{fontSize:'18px'}}>{t.emoji}</span>
                  <span className="theme-label" style={{color:t.textOnLight?'#333':'rgba(255,255,255,0.7)'}}>{t.label}</span>
                </div>
              ))}
            </div>

            <div className="review-grid">
              {shots.map((shot,i)=>(
                <div key={i} className="review-card">
                  <img src={shot.dataUrl} className="review-img" alt={`shot ${i+1}`}/>
                  <div className="review-shot-num">Shot {i+1}</div>
                  <div className="review-actions">
                    <button className="review-btn retake" onClick={()=>retakeShot(i)}>🔄 Retake</button>
                    <button className="review-btn sticker" onClick={()=>openStickers(i)}>🎨 Stickers</button>
                  </div>
                </div>
              ))}
            </div>

            <input className="caption-input" placeholder="Add a caption (optional) ♡" value={caption} onChange={e=>setCaption(e.target.value)}/>

            <div className="btn-row">
              <button className="btn-secondary" onClick={resetAll}>Start Over</button>
              <button className="btn-primary" onClick={handleGenerateStrip}>🎞 Generate Strip!</button>
            </div>
          </>
        )}

        {/* ── STICKER EDITOR ── */}
        {step==='review' && stickerMode && (
          <StickerCanvas
            photoUrl={shots[stickerShotIdx]?.dataUrl}
            onDone={onStickerDone}
            onCancel={()=>setStickerMode(false)}
          />
        )}

        {/* ── STRIP RESULT ── */}
        {step==='strip' && (
          <>
            <p className="page-title">Your Strip! 🎉</p>
            <p className="page-sub">Save it, download it, love it ♡</p>

            {stripUrl && <img src={stripUrl} className="strip-preview-img" alt="photo strip" style={{marginBottom:'16px'}}/>}

            {saved && <div className="success-msg">✨ Saved to our album! He can see it now 💕</div>}

            <div className="btn-row" style={{flexWrap:'wrap'}}>
              <button className="btn-secondary" onClick={resetAll}>New Strip</button>
              <button className="btn-secondary" onClick={downloadStrip}>⬇ Download</button>
              {!saved && (
                <button className="btn-primary" style={{flexBasis:'100%'}} onClick={saveStrip} disabled={uploading}>
                  {uploading?'Saving...':'💾 Save to Album'}
                </button>
              )}
            </div>
          </>
        )}

        {/* ── RECENT PHOTOS — always visible at bottom ── */}
        {step !== 'review' && !stickerMode && (
          <div className="recent-section" style={{marginTop:'24px'}}>
            <div className="recent-header">
              <div className="recent-title">Recent Photos</div>
              <button className="recent-view-all" onClick={()=>router.push('/dashboard')}>
                View All →
              </button>
            </div>
            <div className="recent-scroll">
              {recentLoading
                ? [...Array(5)].map((_,i)=><div key={i} className="recent-shimmer"/>)
                : recentPhotos.length > 0
                  ? recentPhotos.map((p,i)=>(
                      <div key={i} className="recent-thumb" onClick={()=>router.push('/dashboard')}>
                        <img src={p.url} alt={`recent ${i+1}`} loading="lazy"
                          onError={e=>e.currentTarget.parentElement.style.display='none'}/>
                      </div>
                    ))
                  : <div className="recent-empty">
                      <div className="recent-empty-icon">📷</div>
                      <div className="recent-empty-text">No photos yet!{'\n'}Take your first strip ♡</div>
                    </div>
              }
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
