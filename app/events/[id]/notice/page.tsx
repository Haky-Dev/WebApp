'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Unbounded, Space_Grotesk } from 'next/font/google'
import { DEFAULT_SLIDES } from '@/lib/notice-defaults'
import type { SlideData } from '@/lib/notice-defaults'

const unbounded = Unbounded({ subsets: ['latin'], weight: ['400', '600', '700', '800', '900'], display: 'swap' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' })

function EditableText({
  value,
  editActive,
  onUpdate,
  className,
  style,
}: {
  value: string
  editActive: boolean
  onUpdate: (v: string) => void
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <span
      className={className}
      style={style}
      contentEditable={editActive ? true : undefined}
      suppressContentEditableWarning
      onBlur={e => { if (editActive) onUpdate(e.currentTarget.textContent ?? '') }}
    >
      {value}
    </span>
  )
}

export default function NoticePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const [slides, setSlides] = useState<SlideData[]>(DEFAULT_SLIDES)
  const [editActive, setEditActive] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [saving, setSaving] = useState(false)

  function updateField(slideIdx: number, field: string, value: string) {
    setSlides(prev =>
      prev.map((s, i) =>
        i === slideIdx ? { ...s, fields: { ...s.fields, [field]: value } } : s
      )
    )
  }

  useEffect(() => {
    fetch(`/api/events/${id}/notice`)
      .then(r => r.json())
      .then(data => { if (data.slides) setSlides(data.slides) })
      .catch(() => {})

    const token =
      localStorage.getItem(`admin_token_${id}`) ||
      localStorage.getItem('master_token')
    if (token) setIsAdmin(true)
  }, [id])

  useEffect(() => {
    const canvas = document.getElementById('notice-particle-canvas') as HTMLCanvasElement | null
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const COUNT = 80, CONNECT_DIST = 130
    const COLORS = ['#71ea5d', '#f3f36a', '#02f5fd', '#fe54f2']

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    interface Pt { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string; baseAlpha: number; pulse: number; pulseSpeed: number }
    function makeParticle(init: boolean): Pt {
      return {
        x: Math.random() * canvas!.width,
        y: init ? Math.random() * canvas!.height : (Math.random() > 0.5 ? -5 : canvas!.height + 5),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.8 + 0.3,
        alpha: Math.random() * 0.5 + 0.1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        baseAlpha: Math.random() * 0.5 + 0.1,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.02,
      }
    }
    const particles: Pt[] = Array.from({ length: COUNT }, () => makeParticle(true))

    let animId: number
    function loop() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECT_DIST) {
            ctx!.beginPath()
            ctx!.moveTo(particles[i].x, particles[i].y)
            ctx!.lineTo(particles[j].x, particles[j].y)
            ctx!.strokeStyle = particles[i].color
            ctx!.globalAlpha = (1 - dist / CONNECT_DIST) * 0.1
            ctx!.lineWidth = 0.6
            ctx!.stroke()
            ctx!.globalAlpha = 1
          }
        }
      }
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        p.pulse += p.pulseSpeed
        p.alpha = p.baseAlpha * (0.7 + 0.3 * Math.sin(p.pulse))
        if (p.x < -10 || p.x > canvas!.width + 10 || p.y < -10 || p.y > canvas!.height + 10) {
          Object.assign(p, makeParticle(false))
        }
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx!.fillStyle = p.color
        ctx!.globalAlpha = p.alpha
        ctx!.fill()
        ctx!.globalAlpha = 1
      })
      animId = requestAnimationFrame(loop)
    }
    loop()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const slideEls = Array.from(root.querySelectorAll<HTMLElement>('.notice-slide'))
    let current = 0

    const progressBar = root.querySelector<HTMLElement>('.notice-progress-bar')
    const navDots = root.querySelector<HTMLElement>('.notice-nav-dots')

    if (navDots) {
      navDots.innerHTML = ''
      slideEls.forEach((_, i) => {
        const btn = document.createElement('button')
        btn.className = 'notice-nav-dot' + (i === 0 ? ' active' : '')
        btn.setAttribute('aria-label', `슬라이드 ${i + 1}`)
        btn.addEventListener('click', () => goTo(i))
        navDots.appendChild(btn)
      })
    }

    function goTo(idx: number) {
      idx = Math.max(0, Math.min(slideEls.length - 1, idx))
      slideEls[idx].scrollIntoView({ behavior: 'smooth' })
    }
    function updateProgress() {
      if (progressBar) progressBar.style.width = (slideEls.length > 1 ? (current / (slideEls.length - 1)) * 100 : 0) + '%'
    }
    function updateDots() {
      navDots?.querySelectorAll('.notice-nav-dot').forEach((d, i) => d.classList.toggle('active', i === current))
    }

    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('notice-visible')
          const idx = slideEls.indexOf(entry.target as HTMLElement)
          if (idx !== -1) { current = idx; updateProgress(); updateDots() }
        }
      })
    }, { threshold: 0.5, root })
    slideEls.forEach(s => obs.observe(s))

    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).getAttribute('contenteditable')) return
      if (['ArrowDown', 'ArrowRight', 'Space', 'PageDown'].includes(e.code)) { e.preventDefault(); goTo(current + 1) }
      else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.code)) { e.preventDefault(); goTo(current - 1) }
    }
    document.addEventListener('keydown', onKey)

    let lastWheel = 0
    const onWheel = (e: WheelEvent) => {
      const now = Date.now()
      if (now - lastWheel < 800) return
      lastWheel = now
      e.preventDefault()
      goTo(current + (e.deltaY > 0 ? 1 : -1))
    }
    root.addEventListener('wheel', onWheel, { passive: false })

    let startY = 0
    const onTouchStart = (e: TouchEvent) => { startY = e.touches[0].clientY }
    const onTouchEnd = (e: TouchEvent) => {
      const diff = startY - e.changedTouches[0].clientY
      if (Math.abs(diff) > 50) goTo(current + (diff > 0 ? 1 : -1))
    }
    root.addEventListener('touchstart', onTouchStart, { passive: true })
    root.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      obs.disconnect()
      document.removeEventListener('keydown', onKey)
      root.removeEventListener('wheel', onWheel)
      root.removeEventListener('touchstart', onTouchStart)
      root.removeEventListener('touchend', onTouchEnd)
    }
  }, [slides.length])

  useEffect(() => {
    if (!editActive) return
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSave() }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  })

  const handleSave = useCallback(async () => {
    const token =
      localStorage.getItem(`admin_token_${id}`) ||
      localStorage.getItem('master_token')
    if (!token) return
    setSaving(true)
    await fetch(`/api/events/${id}/notice`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ slides }),
    })
    setSaving(false)
    setEditActive(false)
  }, [id, slides])

  function renderSlide(slide: SlideData, idx: number) {
    const f = slide.fields
    const upd = (field: string, v: string) => updateField(idx, field, v)
    const E = ({ field, className, style }: { field: string; className?: string; style?: React.CSSProperties }) => (
      <EditableText value={f[field] ?? ''} editActive={editActive} onUpdate={v => upd(field, v)} className={className} style={style} />
    )

    switch (slide.type) {
      case 'title':
        return (
          <section key={idx} className="notice-slide notice-title-slide">
            <div className="notice-orb notice-orb-1 notice-decorative" />
            <div className="notice-orb notice-orb-2 notice-decorative" />
            <div className="notice-orb notice-orb-3 notice-decorative" />
            <div className="notice-orb notice-orb-4 notice-decorative" />
            <div className="notice-bracket-tl notice-decorative" />
            <div className="notice-bracket-br notice-decorative" />
            <div className="notice-slide-content">
              <E field="eyebrow" className="notice-title-eyebrow notice-reveal" />
              <div className="notice-title-wrapper notice-reveal">
                <img src="/House Tournament Logo.png" alt="Tournament Logo" className="notice-title-logo" />
                <img src="/House Tournament Logo.png" alt="" className="notice-title-logo-ghost" aria-hidden="true" />
              </div>
              <E field="sub" className="notice-title-sub notice-reveal" />
              <div className="notice-title-badge notice-reveal">
                <span>◆</span>
                <E field="badge" />
              </div>
            </div>
          </section>
        )

      case 'rule': {
        const isFinals = f.phaseStyle === 'finals'
        const accent = isFinals ? 'hi-m' : 'hi'
        const slideClass = `notice-slide notice-rule-slide${isFinals ? ' notice-finals-slide' : ''}`
        const cardAccent = isFinals ? 'magenta-accent' : ''
        return (
          <section key={idx} className={slideClass}>
            <div className="notice-orb notice-orb-a notice-decorative" />
            <div className="notice-orb notice-orb-b notice-decorative" />
            <div className="notice-slide-content">
              <div className="notice-slide-header notice-reveal">
                <span className={`notice-phase-tag ${f.phaseStyle}`}>
                  <E field="phaseTag" />
                </span>
                <E field="title" className="notice-slide-title" />
              </div>
              <div className="notice-neon-divider notice-reveal" />
              <div className="notice-rule-grid">
                <div className={`notice-rule-card ${cardAccent} notice-reveal`}>
                  <E field="card1Label" className="notice-rule-label" />
                  <p className="notice-rule-value"><span className={accent}><E field="card1Value" /></span></p>
                </div>
                <div className={`notice-rule-card ${cardAccent} notice-reveal`}>
                  <E field="card2Label" className="notice-rule-label" />
                  <p className="notice-rule-value"><span className={accent}><E field="card2Value" /></span></p>
                </div>
                <div className={`notice-rule-card ${cardAccent} notice-reveal`} style={{ gridColumn: '1/-1' }}>
                  <E field="card3Label" className="notice-rule-label" />
                  <p className="notice-rule-value" style={{ whiteSpace: 'nowrap' }}><E field="card3Value" /></p>
                </div>
                <div className={`notice-rule-card ${cardAccent} notice-reveal`} style={{ gridColumn: '1/-1' }}>
                  <E field="card4Label" className="notice-rule-label" />
                  <p className="notice-rule-value" style={{ whiteSpace: 'nowrap' }}><E field="card4Value" /></p>
                </div>
                {f.card5Value && (
                  <div className={`notice-rule-card ${cardAccent} notice-reveal`} style={{ gridColumn: '1/-1' }}>
                    <E field="card5Label" className="notice-rule-label" />
                    <p className="notice-rule-value">
                      <span className={accent}><E field="card5Value" /></span>
                      {f.card5Note && <small style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.75em', marginTop: '0.3em' }}><E field="card5Note" /></small>}
                    </p>
                  </div>
                )}
              </div>
              <div className="notice-master-out-callout notice-reveal">
                <span className="notice-callout-icon">⚡</span>
                <E field="callout" className="notice-callout-text" />
              </div>
            </div>
          </section>
        )
      }

      case 'prize':
        return (
          <section key={idx} className="notice-slide notice-prize-slide">
            <div className="notice-orb notice-orb-a notice-decorative" />
            <div className="notice-orb notice-orb-b notice-decorative" />
            <div className="notice-slide-content">
              <E field="totalLabel" className="notice-prize-total-label notice-reveal" />
              <E field="total" className="notice-prize-total notice-reveal" />
              <ul className="notice-prize-list">
                {([1, 2, 3] as const).map(n => (
                  <li key={n} className="notice-prize-item notice-reveal">
                    <E field={`item${n}Rank`} className="notice-prize-rank" />
                    <span className="notice-prize-desc">
                      <E field={`item${n}Desc`} />
                      <small><E field={`item${n}Sub`} /></small>
                    </span>
                    <E field={`item${n}Amount`} className="notice-prize-amount" />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )

      case 'event':
        return (
          <section key={idx} className="notice-slide notice-event-slide">
            <div className="notice-orb notice-orb-a notice-decorative" />
            <div className="notice-orb notice-orb-b notice-decorative" />
            <div className="notice-slide-content">
              <E field="neonLabel" className="notice-neon-label notice-reveal" />
              <div className="notice-event-title-box notice-reveal">
                <E field="gameName" className="notice-event-game-name" />
                <E field="gameSubtitle" className="notice-event-subtitle" />
              </div>
              <div className="notice-class-grid">
                <div className="notice-class-card bc notice-reveal">
                  <E field="class1Name" className="notice-class-name" />
                  <E field="class1Rule" className="notice-class-rule" />
                </div>
                <div className="notice-class-card a notice-reveal">
                  <E field="class2Name" className="notice-class-name" />
                  <E field="class2Rule" className="notice-class-rule" />
                </div>
              </div>
              <E field="eventRule" className="notice-event-rule notice-reveal" />
            </div>
          </section>
        )

      case 'closing':
        return (
          <section key={idx} className="notice-slide notice-closing-slide">
            <div className="notice-orb notice-orb-1 notice-decorative" />
            <div className="notice-orb notice-orb-2 notice-decorative" />
            <div className="notice-bracket-tl notice-decorative" />
            <div className="notice-bracket-br notice-decorative" />
            <div className="notice-slide-content">
              <E field="neonLabel" className="notice-neon-label notice-reveal" />
              <h2 className="notice-closing-main notice-reveal">
                <E field="mainLine1" /><br />
                <span className="accent"><E field="mainAccent" /></span>
              </h2>
              <E field="sub" className="notice-closing-sub notice-reveal" />
              <E field="cta" className="notice-closing-cta notice-reveal" />
            </div>
          </section>
        )

      default:
        return null
    }
  }

  return (
    <div
      ref={rootRef}
      className={`notice-root${editActive ? ' edit-active' : ''}`}
      style={{
        '--font-display': unbounded.style.fontFamily,
        '--font-body': spaceGrotesk.style.fontFamily,
      } as React.CSSProperties}
    >
      <canvas id="notice-particle-canvas" />
      <div className="notice-progress-bar" style={{ width: '0%' }} />
      <nav className="notice-nav-dots" aria-label="슬라이드 탐색" />

      <button
        onClick={() => router.back()}
        style={{
          position: 'fixed', top: '1rem', left: isAdmin ? '6rem' : '1rem',
          background: 'rgba(10,10,18,0.8)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.6)',
          fontSize: '0.8rem', fontWeight: 700,
          padding: '0.35em 0.8em', borderRadius: 999,
          cursor: 'pointer', zIndex: 10001,
        }}
      >
        ← 뒤로
      </button>

      {isAdmin && (
        <button
          className="notice-edit-toggle"
          onClick={() => setEditActive(v => !v)}
        >
          {editActive ? 'DONE' : 'EDIT'}
        </button>
      )}
      {editActive && (
        <>
          <div className="notice-edit-banner">
            편집 모드 — 텍스트 클릭 후 수정 · 저장 버튼 또는 Ctrl+S
          </div>
          <button className="notice-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </>
      )}

      {slides.map((slide, idx) => renderSlide(slide, idx))}
    </div>
  )
}
