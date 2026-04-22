'use client';

import { useEffect, useState, useRef } from 'react';
import { CheckCircle, X, ArrowRight } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  autoClose?: number;
}

interface Particle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
}

function generateParticles(count = 18): Particle[] {
  const colors = ['#34C759', '#30D158', '#32ADE6', '#007AFF', '#5AC8FA', '#34C759', '#64D2FF'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (360 / count) * i + (Math.random() * 20 - 10),
    distance: 38 + Math.random() * 28,
    size: 2 + Math.random() * 3,
    duration: 520 + Math.random() * 340,
    delay: Math.random() * 80,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
}

export default function SuccessModal({
  isOpen,
  onClose,
  title = 'All Done',
  message = 'Your action was completed successfully.',
  actionLabel,
  onAction,
  autoClose = 0,
}: SuccessModalProps) {
  const [phase, setPhase] = useState<'hidden' | 'entering' | 'visible' | 'leaving'>('hidden');
  const [progress, setProgress] = useState(100);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [burstActive, setBurstActive] = useState(false);
  const [iconVisible, setIconVisible] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPhase('entering');
      setProgress(100);
      setIconVisible(false);
      setContentVisible(false);
      setBurstActive(false);
      setTimeout(() => setIconVisible(true), 160);
      setTimeout(() => { setParticles(generateParticles(18)); setBurstActive(true); }, 260);
      setTimeout(() => setContentVisible(true), 380);
      setTimeout(() => setBurstActive(false), 1000);
      setTimeout(() => setPhase('visible'), 420);
    } else {
      setPhase('leaving');
      setTimeout(() => {
        setPhase('hidden');
        setIconVisible(false);
        setContentVisible(false);
      }, 280);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || autoClose <= 0) return;
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / autoClose) * 100);
      setProgress(remaining);
      if (remaining === 0) { clearInterval(timerRef.current!); onClose(); }
    }, 16);
    return () => clearInterval(timerRef.current!);
  }, [isOpen, autoClose, onClose]);

  if (phase === 'hidden') return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@400;500;600;700&display=swap');

        * { -webkit-font-smoothing: antialiased; }

        @keyframes sw-backdrop-in  { from{opacity:0} to{opacity:1} }
        @keyframes sw-backdrop-out { from{opacity:1} to{opacity:0} }
        @keyframes sw-sheet-in  {
          0%  { opacity:0; transform:translateY(40px) scale(0.88); }
          60% { opacity:1; transform:translateY(-6px) scale(1.01); }
          80% { transform:translateY(3px) scale(0.995); }
          100%{ opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes sw-sheet-out { from{opacity:1;transform:translateY(0) scale(1)} to{opacity:0;transform:translateY(20px) scale(0.94)} }
        @keyframes sw-icon-spring {
          0%  { transform:scale(0) rotate(-15deg); opacity:0; }
          50% { transform:scale(1.22) rotate(4deg); }
          70% { transform:scale(0.92) rotate(-1deg); }
          100%{ transform:scale(1) rotate(0); opacity:1; }
        }
        @keyframes sw-checkmark { 0%{stroke-dashoffset:50} 100%{stroke-dashoffset:0} }
        @keyframes sw-ring-expand { 0%{transform:scale(1);opacity:0.5} 100%{transform:scale(2.2);opacity:0} }
        @keyframes sw-ring-expand-2 { 0%{transform:scale(1);opacity:0.28} 100%{transform:scale(2.9);opacity:0} }
        @keyframes sw-fade-rise { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sw-particle { 0%{opacity:1;transform:translate(0,0) scale(1)} 70%{opacity:0.6} 100%{opacity:0;transform:translate(var(--tx),var(--ty)) scale(0)} }
        @keyframes sw-shimmer { 0%,100%{opacity:1} 50%{opacity:0.82} }

        .sw-backdrop-in  { animation:sw-backdrop-in  0.24s ease both }
        .sw-backdrop-out { animation:sw-backdrop-out 0.22s ease both }
        .sw-sheet-in     { animation:sw-sheet-in  0.52s cubic-bezier(0.32,1.36,0.48,1) both }
        .sw-sheet-out    { animation:sw-sheet-out 0.26s cubic-bezier(0.4,0,1,1) both }
        .sw-icon-spring  { animation:sw-icon-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) both }
        .sw-ring-1       { animation:sw-ring-expand   1.4s ease-out 0.28s infinite }
        .sw-ring-2       { animation:sw-ring-expand-2 1.4s ease-out 0.52s infinite }
        .sw-fade-rise    { animation:sw-fade-rise 0.34s cubic-bezier(0.32,1.2,0.48,1) both }
        .sw-shimmer      { animation:sw-shimmer 2s ease-in-out infinite }

        .sw-primary-btn {
          background: #34C759;
          border: none;
          color: #fff;
          font-weight: 600;
          font-size: 15px;
          letter-spacing: -0.02em;
          border-radius: 14px;
          padding: 14px 20px;
          cursor: pointer;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: transform 0.12s cubic-bezier(0.34,1.56,0.64,1), filter 0.12s ease;
          font-family: -apple-system, 'SF Pro Display', BlinkMacSystemFont, sans-serif;
          box-shadow: 0 2px 12px rgba(52,199,89,0.32), 0 1px 3px rgba(52,199,89,0.2);
        }
        .sw-primary-btn:hover  { filter:brightness(1.06); transform:scale(1.015); }
        .sw-primary-btn:active { transform:scale(0.96); filter:brightness(0.95); }

        .sw-dismiss-btn {
          background: rgba(0,0,0,0.055);
          border: none;
          color: #3C3C43CC;
          font-weight: 500;
          font-size: 15px;
          letter-spacing: -0.02em;
          border-radius: 14px;
          padding: 14px 20px;
          cursor: pointer;
          width: 100%;
          transition: background 0.12s ease, transform 0.12s cubic-bezier(0.34,1.56,0.64,1);
          font-family: -apple-system, 'SF Pro Display', BlinkMacSystemFont, sans-serif;
        }
        .sw-dismiss-btn:hover  { background:rgba(0,0,0,0.09); }
        .sw-dismiss-btn:active { transform:scale(0.96); }

        .sw-close-btn {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: rgba(0,0,0,0.055);
          border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: #3C3C4399;
          transition: background 0.12s ease, transform 0.1s ease;
        }
        .sw-close-btn:hover  { background: rgba(0,0,0,0.1); }
        .sw-close-btn:active { transform: scale(0.88); }
      `}</style>

      {/* Backdrop — subtle iOS sheet scrim */}
      <div
        className={phase === 'leaving' ? 'sw-backdrop-out' : 'sw-backdrop-in'}
        style={{
          position:'fixed', inset:0, zIndex:50,
          display:'flex', alignItems:'center', justifyContent:'center',
          backgroundColor:'rgba(0,0,0,0.28)',
          backdropFilter:'blur(12px) saturate(1.6)',
          WebkitBackdropFilter:'blur(12px) saturate(1.6)',
        }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* Card — Apple frosted glass sheet */}
        <div
          className={phase === 'leaving' ? 'sw-sheet-out' : 'sw-sheet-in'}
          style={{
            position:'relative',
            width:'100%', maxWidth:'360px',
            margin:'0 16px',
            background:'rgba(255,255,255,0.92)',
            backdropFilter:'blur(40px) saturate(1.8)',
            WebkitBackdropFilter:'blur(40px) saturate(1.8)',
            borderRadius:'24px',
            overflow:'hidden',
            boxShadow:'0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(0,0,0,0.08)',
          }}
        >
          {/* Progress bar */}
          {autoClose > 0 && (
            <div style={{ position:'absolute', top:0, left:0, right:0, height:'2.5px', background:'rgba(0,0,0,0.05)' }}>
              <div style={{ height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,#30D158,#34C759)', borderRadius:'2px', transition:'width 16ms linear' }} />
            </div>
          )}

          {/* Close button */}
          <button className="sw-close-btn" onClick={onClose}
            style={{ position:'absolute', top:'14px', right:'14px', zIndex:10 }}>
            <X size={12} strokeWidth={2.5} />
          </button>

          {/* Body */}
          <div style={{
            padding:'40px 28px 28px',
            display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center',
            fontFamily:"-apple-system, 'SF Pro Display', BlinkMacSystemFont, sans-serif",
          }}>
            {/* Icon zone */}
            <div style={{ position:'relative', width:'72px', height:'72px', marginBottom:'20px', flexShrink:0 }}>

              {/* Particles */}
              {burstActive && particles.map(p => {
                const rad = (p.angle * Math.PI) / 180;
                const tx = Math.cos(rad) * p.distance;
                const ty = Math.sin(rad) * p.distance;
                return (
                  <div key={p.id} style={{
                    position:'absolute', left:'50%', top:'50%',
                    marginLeft:`${-p.size/2}px`, marginTop:`${-p.size/2}px`,
                    width:`${p.size}px`, height:`${p.size}px`,
                    borderRadius:'50%', background:p.color,
                    '--tx':`${tx}px`, '--ty':`${ty}px`,
                    animation:`sw-particle ${p.duration}ms cubic-bezier(0.25,0.46,0.45,0.94) ${p.delay}ms both`,
                    zIndex:6,
                  } as React.CSSProperties} />
                );
              })}

              {/* Rings */}
              {iconVisible && <>
                <div className="sw-ring-1" style={{ position:'absolute', inset:0, borderRadius:'50%', border:'1.5px solid rgba(52,199,89,0.3)' }} />
                <div className="sw-ring-2" style={{ position:'absolute', inset:0, borderRadius:'50%', border:'1px solid rgba(52,199,89,0.15)' }} />
              </>}

              {/* Icon circle — Apple green */}
              <div
                className={iconVisible ? 'sw-icon-spring' : ''}
                style={{
                  width:'72px', height:'72px', borderRadius:'50%',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background:'linear-gradient(145deg, #34C759 0%, #30D158 100%)',
                  boxShadow:'0 4px 20px rgba(52,199,89,0.38), 0 1px 4px rgba(52,199,89,0.2)',
                  opacity: iconVisible ? 1 : 0,
                }}
              >
                <CheckCircle size={32} color="#fff" strokeWidth={2} />
              </div>
            </div>

            {/* Title */}
            <h2
              className={contentVisible ? 'sw-fade-rise' : ''}
              style={{
                fontSize:'19px', fontWeight:700,
                color:'#000000',
                letterSpacing:'-0.04em', lineHeight:1.2,
                marginBottom:'6px',
                opacity: contentVisible ? 1 : 0,
              }}
            >
              {title}
            </h2>

            {/* Message */}
            <p
              className={contentVisible ? 'sw-fade-rise' : ''}
              style={{
                fontSize:'14px', color:'rgba(60,60,67,0.72)',
                lineHeight:1.55, marginBottom:'24px', maxWidth:'270px',
                letterSpacing:'-0.01em',
                opacity: contentVisible ? 1 : 0, animationDelay:'45ms',
              }}
            >
              {message}
            </p>

            {/* Separator — iOS hairline */}
            <div style={{ width:'100%', height:'0.5px', background:'rgba(60,60,67,0.18)', marginBottom:'18px' }} />

            {/* Actions */}
            <div
              className={contentVisible ? 'sw-fade-rise' : ''}
              style={{ width:'100%', display:'flex', flexDirection:'column', gap:'8px', opacity: contentVisible ? 1 : 0, animationDelay:'90ms' }}
            >
              {actionLabel && onAction && (
                <button className="sw-primary-btn" onClick={onAction}>
                  {actionLabel}
                  <ArrowRight size={15} strokeWidth={2.5} />
                </button>
              )}
              <button className="sw-dismiss-btn" onClick={onClose}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}