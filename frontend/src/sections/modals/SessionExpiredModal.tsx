'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Clock, X } from 'lucide-react';

const COUNTDOWN_MS = 60_000;

interface SessionExpiredModalProps {
  isOpen: boolean;
  onStayLoggedIn: () => void;
  onLogOut: () => void;
}

export default function SessionExpiredModal({
  isOpen,
  onStayLoggedIn,
  onLogOut,
}: SessionExpiredModalProps) {
  const [phase, setPhase] = useState<'hidden' | 'entering' | 'visible' | 'leaving'>('hidden');
  const [iconVisible, setIconVisible] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [barWidth, setBarWidth] = useState(100);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCountdown = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setPhase('entering');
      setIconVisible(false);
      setContentVisible(false);
      setSecondsLeft(60);
      setBarWidth(100);
      setTimeout(() => setIconVisible(true), 180);
      setTimeout(() => setContentVisible(true), 380);
      setTimeout(() => setPhase('visible'), 440);

      const start = Date.now();
      stopCountdown();
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, COUNTDOWN_MS - elapsed);
        setSecondsLeft(Math.ceil(remaining / 1000));
        setBarWidth((remaining / COUNTDOWN_MS) * 100);
        if (remaining === 0) {
          stopCountdown();
          onLogOut();
        }
      }, 250);
    } else {
      stopCountdown();
      setPhase('leaving');
      setTimeout(() => {
        setPhase('hidden');
        setIconVisible(false);
        setContentVisible(false);
        setSecondsLeft(60);
        setBarWidth(100);
      }, 260);
    }

    return stopCountdown;
  }, [isOpen, onLogOut, stopCountdown]);

  if (phase === 'hidden') return null;

  return (
    <>
      <style>{`
        * { -webkit-font-smoothing: antialiased; }

        @keyframes se-backdrop-in  { from{opacity:0} to{opacity:1} }
        @keyframes se-backdrop-out { from{opacity:1} to{opacity:0} }
        @keyframes se-sheet-in {
          0%  { opacity:0; transform:translateY(40px) scale(0.88); }
          60% { opacity:1; transform:translateY(-6px) scale(1.01); }
          80% { transform:translateY(3px) scale(0.995); }
          100%{ opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes se-sheet-out { from{opacity:1;transform:translateY(0) scale(1)} to{opacity:0;transform:translateY(20px) scale(0.94)} }
        @keyframes se-icon-drop {
          0%  { transform:scale(0) rotate(20deg); opacity:0; }
          55% { transform:scale(1.2) rotate(-4deg); }
          75% { transform:scale(0.93) rotate(1deg); }
          100%{ transform:scale(1) rotate(0); opacity:1; }
        }
        @keyframes se-ring-expand { 0%{transform:scale(1);opacity:0.45} 100%{transform:scale(2.1);opacity:0} }
        @keyframes se-fade-rise   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

        .se-backdrop-in  { animation:se-backdrop-in  0.22s ease both }
        .se-backdrop-out { animation:se-backdrop-out 0.20s ease both }
        .se-sheet-in     { animation:se-sheet-in  0.52s cubic-bezier(0.32,1.36,0.48,1) both }
        .se-sheet-out    { animation:se-sheet-out 0.24s cubic-bezier(0.4,0,1,1) both }
        .se-icon-drop    { animation:se-icon-drop 0.5s cubic-bezier(0.34,1.56,0.64,1) both }
        .se-ring-expand  { animation:se-ring-expand 1.4s ease-out 0.26s infinite }
        .se-fade-rise    { animation:se-fade-rise 0.34s cubic-bezier(0.32,1.2,0.48,1) both }

        .se-primary-btn {
          background: linear-gradient(135deg, #FF9500 0%, #FF6B00 100%);
          border: none;
          color: #fff;
          font-weight: 600;
          font-size: 15px;
          letter-spacing: -0.02em;
          border-radius: 14px;
          padding: 14px 20px;
          cursor: pointer;
          width: 100%;
          transition: opacity 0.12s ease, transform 0.12s cubic-bezier(0.34,1.56,0.64,1);
          font-family: -apple-system, 'SF Pro Display', BlinkMacSystemFont, sans-serif;
          box-shadow: 0 2px 12px rgba(255,149,0,0.35);
        }
        .se-primary-btn:hover  { opacity:0.9; }
        .se-primary-btn:active { transform:scale(0.96); }

        .se-dismiss-btn {
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
        .se-dismiss-btn:hover  { background:rgba(0,0,0,0.09); }
        .se-dismiss-btn:active { transform:scale(0.96); }

        .se-close-btn {
          width:28px; height:28px;
          border-radius:50%;
          background:rgba(0,0,0,0.055);
          border:none;
          display:flex; align-items:center; justify-content:center;
          cursor:pointer;
          color:#3C3C4399;
          transition:background 0.12s ease, transform 0.1s ease;
        }
        .se-close-btn:hover  { background:rgba(0,0,0,0.1); }
        .se-close-btn:active { transform:scale(0.88); }
      `}</style>

      {/* Backdrop */}
      <div
        className={phase === 'leaving' ? 'se-backdrop-out' : 'se-backdrop-in'}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.28)',
          backdropFilter: 'blur(12px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(12px) saturate(1.6)',
        }}
      >
        {/* Card */}
        <div
          className={phase === 'leaving' ? 'se-sheet-out' : 'se-sheet-in'}
          style={{
            position: 'relative',
            width: '100%', maxWidth: '360px',
            margin: '0 16px',
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(40px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(0,0,0,0.08)',
          }}
        >
          {/* Amber top accent */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, transparent 0%, rgba(255,149,0,0.7) 50%, transparent 100%)' }} />

          {/* Countdown progress bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2.5px', background: 'rgba(0,0,0,0.05)' }}>
            <div style={{
              height: '100%',
              width: `${barWidth}%`,
              background: 'linear-gradient(90deg,#FF6B00,#FF9500)',
              borderRadius: '2px',
              transition: 'width 250ms linear',
            }} />
          </div>

          {/* Close button → treat as log out */}
          <button className="se-close-btn" onClick={onLogOut}
            style={{ position: 'absolute', top: '14px', right: '14px', zIndex: 10 }}>
            <X size={12} strokeWidth={2.5} />
          </button>

          {/* Body */}
          <div style={{
            padding: '40px 28px 28px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            fontFamily: "-apple-system, 'SF Pro Display', BlinkMacSystemFont, sans-serif",
          }}>
            {/* Icon zone */}
            <div style={{ position: 'relative', width: '72px', height: '72px', marginBottom: '20px', flexShrink: 0 }}>
              {iconVisible && (
                <div className="se-ring-expand" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(255,149,0,0.35)' }} />
              )}
              <div
                className={iconVisible ? 'se-icon-drop' : ''}
                style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(145deg, #FF9500 0%, #FF6B00 100%)',
                  boxShadow: '0 4px 20px rgba(255,149,0,0.35), 0 1px 4px rgba(255,149,0,0.18)',
                  opacity: iconVisible ? 1 : 0,
                }}
              >
                <Clock size={32} color="#fff" strokeWidth={2} />
              </div>
            </div>

            {/* Title */}
            <h2
              className={contentVisible ? 'se-fade-rise' : ''}
              style={{
                fontSize: '19px', fontWeight: 700,
                color: '#000000',
                letterSpacing: '-0.04em', lineHeight: 1.2,
                marginBottom: '6px',
                opacity: contentVisible ? 1 : 0,
              }}
            >
              Session Expired
            </h2>

            {/* Message */}
            <p
              className={contentVisible ? 'se-fade-rise' : ''}
              style={{
                fontSize: '14px', color: 'rgba(60,60,67,0.72)',
                lineHeight: 1.55, marginBottom: '24px', maxWidth: '270px',
                letterSpacing: '-0.01em',
                opacity: contentVisible ? 1 : 0, animationDelay: '45ms',
              }}
            >
              Your session has expired. Stay logged in?{' '}
              <span style={{ fontWeight: 600, color: '#FF9500' }}>({secondsLeft}s)</span>
            </p>

            {/* Separator */}
            <div style={{ width: '100%', height: '0.5px', background: 'rgba(60,60,67,0.18)', marginBottom: '18px' }} />

            {/* Actions */}
            <div
              className={contentVisible ? 'se-fade-rise' : ''}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', opacity: contentVisible ? 1 : 0, animationDelay: '90ms' }}
            >
              <button className="se-primary-btn" onClick={onStayLoggedIn}>
                Stay Logged In
              </button>
              <button className="se-dismiss-btn" onClick={onLogOut}>
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
