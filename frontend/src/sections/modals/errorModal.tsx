'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { XCircle, X, RotateCcw } from 'lucide-react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
  autoClose?: number;
}

export default function ErrorModal({
  isOpen,
  onClose,
  title = 'Something Went Wrong',
  message = 'An unexpected error occurred. Please try again.',
  retryLabel,
  onRetry,
  autoClose = 0,
}: ErrorModalProps) {
  const [phase, setPhase] = useState<'hidden' | 'entering' | 'visible' | 'leaving'>('hidden');
  const [progress, setProgress] = useState(100);
  const [iconVisible, setIconVisible] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [shaking, setShaking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const triggerShake = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 480);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setPhase('entering');
      setProgress(100);
      setIconVisible(false);
      setContentVisible(false);
      setTimeout(() => setIconVisible(true), 180);
      setTimeout(() => triggerShake(), 240);
      setTimeout(() => setContentVisible(true), 380);
      setTimeout(() => setPhase('visible'), 440);
    } else {
      setPhase('leaving');
      setTimeout(() => {
        setPhase('hidden');
        setIconVisible(false);
        setContentVisible(false);
      }, 260);
    }
  }, [isOpen, triggerShake]);

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

  const handleRetry = () => {
    triggerShake();
    setTimeout(() => onRetry?.(), 180);
  };

  if (phase === 'hidden') return null;

  return (
    <>
      <style>{`
        * { -webkit-font-smoothing: antialiased; }

        @keyframes ew-backdrop-in  { from{opacity:0} to{opacity:1} }
        @keyframes ew-backdrop-out { from{opacity:1} to{opacity:0} }
        @keyframes ew-sheet-in {
          0%  { opacity:0; transform:translateY(40px) scale(0.88); }
          60% { opacity:1; transform:translateY(-6px) scale(1.01); }
          80% { transform:translateY(3px) scale(0.995); }
          100%{ opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes ew-sheet-out { from{opacity:1;transform:translateY(0) scale(1)} to{opacity:0;transform:translateY(20px) scale(0.94)} }
        @keyframes ew-shake {
          0%,100%{ transform:translateX(0) }
          12%{ transform:translateX(-8px) }
          28%{ transform:translateX(8px) }
          44%{ transform:translateX(-5px) }
          60%{ transform:translateX(5px) }
          76%{ transform:translateX(-2px) }
          88%{ transform:translateX(2px) }
        }
        @keyframes ew-icon-drop {
          0%  { transform:scale(0) rotate(20deg); opacity:0; }
          55% { transform:scale(1.2) rotate(-4deg); }
          75% { transform:scale(0.93) rotate(1deg); }
          100%{ transform:scale(1) rotate(0); opacity:1; }
        }
        @keyframes ew-ring-expand { 0%{transform:scale(1);opacity:0.45} 100%{transform:scale(2.1);opacity:0} }
        @keyframes ew-fade-rise   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ew-spin        { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }

        .ew-backdrop-in  { animation:ew-backdrop-in  0.22s ease both }
        .ew-backdrop-out { animation:ew-backdrop-out 0.2s  ease both }
        .ew-sheet-in     { animation:ew-sheet-in  0.52s cubic-bezier(0.32,1.36,0.48,1) both }
        .ew-sheet-out    { animation:ew-sheet-out 0.24s cubic-bezier(0.4,0,1,1) both }
        .ew-shake        { animation:ew-shake 0.46s cubic-bezier(0.36,0.07,0.19,0.97) both }
        .ew-icon-drop    { animation:ew-icon-drop 0.5s cubic-bezier(0.34,1.56,0.64,1) both }
        .ew-ring-expand  { animation:ew-ring-expand 1.4s ease-out 0.26s infinite }
        .ew-fade-rise    { animation:ew-fade-rise 0.34s cubic-bezier(0.32,1.2,0.48,1) both }

        .ew-retry-btn {
          background: rgba(255,59,48,0.08);
          border: 0.5px solid rgba(255,59,48,0.3);
          color: #FF3B30;
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
          gap: 7px;
          transition: background 0.12s ease, transform 0.12s cubic-bezier(0.34,1.56,0.64,1);
          font-family: -apple-system, 'SF Pro Display', BlinkMacSystemFont, sans-serif;
        }
        .ew-retry-btn:hover  { background:rgba(255,59,48,0.13); }
        .ew-retry-btn:active { transform:scale(0.96); }
        .ew-retry-btn:hover .ew-spin-icon { animation:ew-spin 0.45s ease both; }

        .ew-dismiss-btn {
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
        .ew-dismiss-btn:hover  { background:rgba(0,0,0,0.09); }
        .ew-dismiss-btn:active { transform:scale(0.96); }

        .ew-close-btn {
          width:28px; height:28px;
          border-radius:50%;
          background:rgba(0,0,0,0.055);
          border:none;
          display:flex; align-items:center; justify-content:center;
          cursor:pointer;
          color:#3C3C4399;
          transition:background 0.12s ease, transform 0.1s ease;
        }
        .ew-close-btn:hover  { background:rgba(0,0,0,0.1); }
        .ew-close-btn:active { transform:scale(0.88); }
      `}</style>

      {/* Backdrop */}
      <div
        className={phase === 'leaving' ? 'ew-backdrop-out' : 'ew-backdrop-in'}
        style={{
          position:'fixed', inset:0, zIndex:50,
          display:'flex', alignItems:'center', justifyContent:'center',
          backgroundColor:'rgba(0,0,0,0.28)',
          backdropFilter:'blur(12px) saturate(1.6)',
          WebkitBackdropFilter:'blur(12px) saturate(1.6)',
        }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* Card */}
        <div
          className={`${phase === 'leaving' ? 'ew-sheet-out' : 'ew-sheet-in'} ${shaking ? 'ew-shake' : ''}`}
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
          {/* Subtle red top tint */}
          <div style={{ position:'absolute', top:0, left:0, right:0, height:'3px', background:'linear-gradient(90deg, transparent 0%, rgba(255,59,48,0.6) 50%, transparent 100%)' }} />

          {/* Progress bar */}
          {autoClose > 0 && (
            <div style={{ position:'absolute', top:0, left:0, right:0, height:'2.5px', background:'rgba(0,0,0,0.05)' }}>
              <div style={{ height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,#D70015,#FF3B30)', borderRadius:'2px', transition:'width 16ms linear' }} />
            </div>
          )}

          {/* Close button */}
          <button className="ew-close-btn" onClick={onClose}
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
              {iconVisible && (
                <div className="ew-ring-expand" style={{ position:'absolute', inset:0, borderRadius:'50%', border:'1.5px solid rgba(255,59,48,0.28)' }} />
              )}

              <div
                className={iconVisible ? 'ew-icon-drop' : ''}
                style={{
                  width:'72px', height:'72px', borderRadius:'50%',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background:'linear-gradient(145deg, #FF453A 0%, #FF3B30 100%)',
                  boxShadow:'0 4px 20px rgba(255,59,48,0.35), 0 1px 4px rgba(255,59,48,0.18)',
                  opacity: iconVisible ? 1 : 0,
                }}
              >
                <XCircle size={32} color="#fff" strokeWidth={2} />
              </div>
            </div>

            {/* Title */}
            <h2
              className={contentVisible ? 'ew-fade-rise' : ''}
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
              className={contentVisible ? 'ew-fade-rise' : ''}
              style={{
                fontSize:'14px', color:'rgba(60,60,67,0.72)',
                lineHeight:1.55, marginBottom:'24px', maxWidth:'270px',
                letterSpacing:'-0.01em',
                opacity: contentVisible ? 1 : 0, animationDelay:'45ms',
              }}
            >
              {message}
            </p>

            {/* Separator */}
            <div style={{ width:'100%', height:'0.5px', background:'rgba(60,60,67,0.18)', marginBottom:'18px' }} />

            {/* Actions */}
            <div
              className={contentVisible ? 'ew-fade-rise' : ''}
              style={{ width:'100%', display:'flex', flexDirection:'column', gap:'8px', opacity: contentVisible ? 1 : 0, animationDelay:'90ms' }}
            >
              {retryLabel && onRetry && (
                <button className="ew-retry-btn" onClick={handleRetry}>
                  <RotateCcw size={15} strokeWidth={2.2} className="ew-spin-icon" />
                  {retryLabel}
                </button>
              )}
              <button className="ew-dismiss-btn" onClick={onClose}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}