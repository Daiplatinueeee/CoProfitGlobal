import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Lock, LogOut, ChevronLeft, Users, ClipboardClock } from 'lucide-react';

import GeneratePin from '../tabs/GeneratePin';
import UsersOverview from '../tabs/UsersOverview';
import PendingPayouts from '../tabs/PendingPayouts';
import PendingWithdrawGC from '../tabs/PendingWithdrawGC';

const KEYFRAMES = `
  @keyframes crane-swing {
    0%,100% { transform: rotate(-5deg); }
    50%      { transform: rotate(5deg);  }
  }
  @keyframes rope-drop {
    0%,100% { height: 52px; }
    50%      { height: 70px; }
  }
  @keyframes hook-sway {
    0%,100% { transform: translateX(0);   }
    50%      { transform: translateX(8px); }
  }
  @keyframes build-up {
    from { transform: scaleY(0); opacity: 0; }
    to   { transform: scaleY(1); opacity: 1; }
  }
  @keyframes worker-walk {
    0%,100% { transform: translateX(0);    }
    50%      { transform: translateX(16px); }
  }
  @keyframes worker-walk-r {
    0%,100% { transform: translateX(0);     }
    50%      { transform: translateX(-16px); }
  }
  @keyframes helmet-bob {
    0%,100% { transform: translateY(0);   }
    50%      { transform: translateY(-5px); }
  }
  @keyframes dust-puff {
    0%   { transform: scale(0.3); opacity: 0.8; }
    100% { transform: scale(1.8) translateY(-20px); opacity: 0; }
  }
  @keyframes spark {
    0%   { opacity: 1; transform: translate(0,0) scale(1); }
    100% { opacity: 0; transform: translate(var(--sx), var(--sy)) scale(0.2); }
  }
  @keyframes scaffold-appear {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes prog-fill {
    from { width: 0%;  }
    to   { width: 60%; }
  }
  @keyframes blink-light {
    0%,49%  { opacity: 1;    background: #ef4444; }
    50%,100%{ opacity: 0.15; background: #7f1d1d; }
  }
  @keyframes caution-scroll {
    from { background-position: 0 0;    }
    to   { background-position: 48px 0; }
  }
  @keyframes gear-cw  { to { transform: rotate(360deg);  } }
  @keyframes gear-ccw { to { transform: rotate(-360deg); } }
  @keyframes sign-sway {
    0%,100% { transform: rotate(-3deg); }
    50%      { transform: rotate(3deg);  }
  }
  @keyframes float-chip {
    0%   { opacity: 0;   transform: translateY(0)     scale(0.8); }
    20%  { opacity: 0.7; }
    100% { opacity: 0;   transform: translateY(-50px) scale(1);   }
  }
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0);    }
  }

  /* named animation helpers */
  .anim-floor-1  { transform-origin: bottom center; animation: build-up .45s ease-out .1s  both; }
  .anim-floor-2  { transform-origin: bottom center; animation: build-up .45s ease-out .6s  both; }
  .anim-floor-3  { transform-origin: bottom center; animation: build-up .45s ease-out 1.1s both; }
  .anim-floor-4  { transform-origin: bottom center; animation: build-up .45s ease-out 1.6s both; }
  .anim-scaffold { animation: scaffold-appear .5s ease-out 2s both; }
  .anim-crane    { transform-origin: right center; animation: crane-swing 5s ease-in-out infinite; }
  .anim-rope     { animation: rope-drop  3s ease-in-out infinite; }
  .anim-hook     { animation: hook-sway  3s ease-in-out infinite; }
  .anim-worker-a { animation: worker-walk   2s  ease-in-out       infinite; }
  .anim-worker-b { animation: worker-walk-r 2.6s ease-in-out .5s  infinite; }
  .anim-helmet   { animation: helmet-bob .95s ease-in-out infinite; }
  .anim-dust-1   { animation: dust-puff 1.5s ease-out        infinite; }
  .anim-dust-2   { animation: dust-puff 1.5s ease-out .75s   infinite; }
  .anim-light    { animation: blink-light 1.1s step-start     infinite; }
  .anim-sign     { transform-origin: top center; animation: sign-sway 3.5s ease-in-out infinite; }
  .anim-prog     { animation: prog-fill 2.4s cubic-bezier(.4,0,.2,1) .4s both; }
  .anim-fade-up  { animation: fade-in-up .6s ease both; }

  .caution-tape {
    background: repeating-linear-gradient(
      90deg, #f59e0b 0, #f59e0b 24px, #1e293b 24px, #1e293b 48px
    );
    animation: caution-scroll 1s linear infinite;
  }
`;

/* ── Gear (SVG, can't be pure Tailwind) ── */
function Gear({
  x, y, r, teeth, dir, speed, fill,
}: { x: number; y: number; r: number; teeth: number; dir: 'cw' | 'ccw'; speed: number; fill: string }) {
  const toothH = r * 0.35;
  return (
    <g style={{ transformOrigin: `${x}px ${y}px`, animation: `gear-${dir} ${speed}s linear infinite` }}>
      {Array.from({ length: teeth }).map((_, i) => (
        <rect
          key={i}
          x={x + Math.cos((i / teeth) * Math.PI * 2) * (r - 1) - 3}
          y={y + Math.sin((i / teeth) * Math.PI * 2) * (r - 1) - toothH / 2}
          width={6} height={toothH} rx={1}
          fill={fill} stroke="#92400e" strokeWidth={0.5}
          transform={`rotate(${(i / teeth) * 360} ${x} ${y})`}
        />
      ))}
      <circle cx={x} cy={y} r={r} fill={fill} stroke="#92400e" strokeWidth={1} />
      <circle cx={x} cy={y} r={r * 0.38} fill="#78350f" />
    </g>
  );
}

/* ── Spark dot ── */
function Spark({ dx, dy, delay }: { dx: string; dy: string; delay: number }) {
  return (
    <div
      className="absolute bottom-55.5 left-[calc(50%+98px)] w-1 h-1 rounded-full bg-amber-400"
      style={{ '--sx': dx, '--sy': dy, animation: `spark .7s ease-out ${delay}s infinite` } as React.CSSProperties}
    />
  );
}

/* ── Worker figure ── */
function Worker({
  wrapClass, helmetClass, bodyClass,
}: { wrapClass: string; helmetClass: string; bodyClass: string }) {
  return (
    <div className={`absolute bottom-13 flex flex-col items-center ${wrapClass}`}>
      <div className={`anim-helmet w-5 h-2.25 rounded-t-[10px] border border-white/40 ${helmetClass}`} />
      <div className="w-3.25 h-3.25 bg-amber-200 rounded-full border border-amber-500" />
      <div className={`w-4.5 h-5 rounded-sm ${bodyClass}`} />
      <div className="flex gap-0.5">
        <div className="w-1.75 h-3 bg-blue-900" />
        <div className="w-1.75 h-3 bg-blue-900" />
      </div>
    </div>
  );
}

/* ── Construction scene ── */
function ConstructionScene() {
  return (
    <div className="relative w-full h-75 overflow-hidden shrink-0">
      <style>{KEYFRAMES}</style>

      {/* sky gradient */}
      <div className="absolute inset-0 bg-linear-to-b from-blue-100 via-blue-50 to-amber-50" />

      {/* clouds */}
      <div className="absolute top-3.5 left-[8%] w-17.5 h-5.5 bg-white/85 rounded-[30px]" />
      <div className="absolute top-5 left-[65%]  w-13.75 h-4.5 bg-white/85 rounded-[30px]" />

      {/* ground */}
      <div className="absolute bottom-0 inset-x-0 h-13 bg-amber-800 border-t-[3px] border-amber-900" />
      {/* ground stripe texture */}
      <div
        className="absolute bottom-0 inset-x-0 h-13"
        style={{ background: 'repeating-linear-gradient(90deg,transparent 0,transparent 28px,rgba(0,0,0,.07) 28px,rgba(0,0,0,.07) 30px)' }}
      />

      {/* ── BUILDING ── */}
      <div className="absolute bottom-13 left-1/2 -translate-x-1/2 w-47">
        {/* floor 4 — partially built */}
        <div className="anim-floor-4 relative h-9 bg-slate-300 border-2 border-slate-400 border-b-0 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 right-[40%]"
            style={{ background: 'repeating-linear-gradient(45deg,#e2e8f0 0,#e2e8f0 4px,transparent 4px,transparent 9px)' }}
          />
          <div className="flex items-center justify-around h-full">
            <div className="w-7 h-5.5 bg-blue-300 border border-blue-400" />
            <div className="w-7 h-5.5 bg-blue-300 border border-blue-400" />
            <div className="w-7 h-5.5 bg-blue-100 border border-blue-300 opacity-40" />
          </div>
        </div>

        {/* floor 3 */}
        <div className="anim-floor-3 h-10.5 bg-slate-200 border-2 border-slate-400 border-b-0 flex items-center justify-around">
          {[0, 1, 2].map(i => <div key={i} className="w-7 h-6.5 bg-blue-200 border border-blue-300" />)}
        </div>

        {/* floor 2 */}
        <div className="anim-floor-2 h-10.5 bg-slate-200 border-2 border-slate-400 border-b-0 flex items-center justify-around">
          {[0, 1, 2].map(i => <div key={i} className="w-7 h-6.5 bg-blue-200 border border-blue-300" />)}
        </div>

        {/* floor 1 — base with door */}
        <div className="anim-floor-1 h-11.5 bg-gray-300 border-2 border-gray-400 flex items-center justify-around">
          <div className="w-8.5 h-9.5 bg-amber-900 border-2 border-amber-950" />
          <div className="w-7 h-6.5 bg-blue-200 border border-blue-300" />
          <div className="w-7 h-6.5 bg-blue-200 border border-blue-300" />
        </div>
      </div>

      {/* ── SCAFFOLD (right of building) ── */}
      <div className="anim-scaffold absolute bottom-13 left-[calc(50%+94px)]">
        {/* poles */}
        <div className="absolute bottom-0 left-0 w-1 h-42 bg-amber-500" />
        <div className="absolute bottom-0 left-5.5 w-1 h-42 bg-amber-500" />
        {/* planks */}
        {[0, 42, 84, 126].map(h => (
          <div key={h} className="absolute left-0 w-6.5 h-1.25 bg-amber-900" style={{ bottom: h }} />
        ))}
        {/* blink light */}
        <div className="anim-light absolute left-2 w-2.5 h-2.5 rounded-full" style={{ bottom: 172 }} />
      </div>

      {/* ── CRANE ── */}
      <div className="absolute bottom-13 right-12">
        {/* mast */}
        <div className="absolute bottom-0 right-0 w-3 h-52.5 bg-amber-500 border border-amber-600" />
        {/* arm */}
        <div className="anim-crane absolute right-0 w-32.5 h-2.25 bg-amber-500 border border-amber-600" style={{ bottom: 207 }}>
          {/* counter-weight */}
          <div className="absolute right-0 top-0 w-6 h-4.5 bg-amber-900 border border-amber-950" />
        </div>
        {/* rope */}
        <div className="anim-rope absolute right-17 w-0.5 bg-slate-800" style={{ bottom: 155 }} />
        {/* hook */}
        <div className="anim-hook absolute right-15.5 w-3.5 h-3 border-2 border-slate-800 border-b-0 rounded-t-sm" style={{ bottom: 92 }} />
        {/* load block */}
        <div className="absolute right-14 w-6.5 h-5 bg-slate-500 border-2 border-slate-600" style={{ bottom: 72 }} />
      </div>

      {/* ── GEARS ── */}
      <svg className="absolute bottom-13 left-3.5 block" width={68} height={68} viewBox="0 0 68 68">
        <Gear x={24} y={44} r={18} teeth={8} dir="cw" speed={5} fill="#fbbf24" />
        <Gear x={50} y={32} r={12} teeth={6} dir="ccw" speed={3.3} fill="#fde68a" />
      </svg>

      {/* ── WORKERS ── */}
      <Worker wrapClass="anim-worker-a left-[28%]" helmetClass="bg-amber-500" bodyClass="bg-orange-500" />
      <Worker wrapClass="anim-worker-b left-[38%]" helmetClass="bg-red-500" bodyClass="bg-sky-500" />

      {/* shovel on worker B */}
      <div
        className="absolute bottom-16 w-0.75 h-7.5 bg-amber-900 origin-top"
        style={{ left: 'calc(38% + 18px)', transform: 'rotate(18deg)' }}
      >
        <div className="absolute -left-1 bottom-0 w-2.75 h-2 bg-amber-950 rounded-sm" />
      </div>

      {/* ── DUST ── */}
      <div className="anim-dust-1 absolute bottom-15.5 left-[24%] w-7.5 h-4.5 bg-amber-700/40 rounded-full" />
      <div className="anim-dust-2 absolute bottom-15 left-[45%] w-5.5 h-3.5 bg-amber-700/35 rounded-full" />

      {/* ── SPARKS ── */}
      <Spark dx="10px" dy="-14px" delay={0} />
      <Spark dx="-12px" dy="-8px" delay={0.18} />
      <Spark dx="16px" dy="-5px" delay={0.36} />
      <Spark dx="-7px" dy="-16px" delay={0.54} />
      <Spark dx="5px" dy="-20px" delay={0.72} />

      {/* ── CONSTRUCTION SIGN ── */}
      <div className="absolute bottom-13 left-4 flex flex-col items-center">
        <div className="anim-sign flex flex-col items-center justify-center w-18 h-12 bg-amber-400 border-[2.5px] border-amber-600 rounded-sm gap-0.5">
          <span className="text-sm leading-none">⚠️</span>
          <span className="text-[8px] font-black text-slate-900 tracking-wider">UNDER</span>
          <span className="text-[8px] font-black text-slate-900 tracking-wider">CONSTRUCTION</span>
        </div>
        <div className="w-1 h-9 bg-amber-500" />
      </div>

      {/* ── CAUTION TAPE across scene ── */}
      <div className="caution-tape absolute left-0 right-0 h-2.5 opacity-85" style={{ bottom: 44 }} />

      {/* ── FLOATING DEBRIS ── */}
      {[
        { left: '32%', bottom: 155, delay: 0 },
        { left: '57%', bottom: 195, delay: 0.9 },
        { left: '22%', bottom: 135, delay: 1.6 },
        { left: '72%', bottom: 175, delay: 0.45 },
      ].map((p, i) => (
        <div
          key={i}
          className="absolute w-1.25 h-1.25 bg-slate-400 rounded-sm"
          style={{ left: p.left, bottom: p.bottom, animation: `float-chip 2.2s ease-out ${p.delay}s infinite` }}
        />
      ))}
    </div>
  );
}

/* ── Under-development panel ── */
function UnderDevelopmentContent() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    let n = 0;
    const id = setInterval(() => { n = (n + 1) % 4; setDots('.'.repeat(n)); }, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-full bg-white rounded-3xl overflow-hidden flex flex-col">

      <ConstructionScene />

      {/* info section */}
      <div className="anim-fade-up flex flex-col items-center gap-5 px-8 pt-7 pb-9 mt-20">

        {/* headline */}
        <div className="text-center">
          <h2 className="text-[26px] tracking-tight text-slate-900 m-0">
            Under Construction
          </h2>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            Our developers is doing their best to complete this section{dots}
            <br />We'll have it ready for you soon. Grab a hard hat!
          </p>
        </div>

        {/* progress bar */}
        <div className="w-full max-w-110">
          <div className="flex justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500">Build progress</span>
            <span className="text-xs font-bold text-amber-500">60%</span>
          </div>
          <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="anim-prog h-full rounded-full bg-linear-to-r from-amber-400 to-orange-500"
            />
          </div>
        </div>

        {/* status chips */}
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            // { label: '✓ PIN Creation',     cls: 'bg-green-100  text-green-800'  },
            { label: '⚙ Users Overview Testing Phase', cls: 'bg-amber-100  text-amber-800' },
            { label: '⚙ PIN Creation Testing Phase', cls: 'bg-amber-100  text-amber-800' },
            { label: '⚙ Pending Payouts Testing Phase', cls: 'bg-amber-100  text-amber-800' },
            { label: '⚙ Pending Withdrawals (GC) Testing Phase', cls: 'bg-amber-100  text-amber-800' },
            { label: '⚙ My Account Testing Phase', cls: 'bg-amber-100  text-amber-800' },
            { label: '○ Admin Dashboard Details Overview', cls: 'bg-slate-100  text-slate-600' },
            { label: '○ Final Testing Phase', cls: 'bg-slate-100  text-slate-600' },
            { label: '○ Deployment Phase', cls: 'bg-slate-100  text-slate-600' },
          ].map(({ label, cls }) => (
            <span key={label} className={`text-xs font-semibold px-3.5 py-1 rounded-full ${cls}`}>
              {label}
            </span>
          ))}
        </div>

      </div>
    </div>
  );
}

/* ── Main dashboard component ── */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  const menuItems = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'generate-pin', label: 'Generate PIN', icon: Lock },
    { id: 'users', label: 'Users Overview', icon: Users },
    { id: 'pendingPayouts', label: 'Pending Payouts', icon: ClipboardClock },
    { id: 'pendingWithdrawGC', label: 'Pending Withdrawals (GC)', icon: ClipboardClock },
  ], []);

  const renderTabContent = () => {
    const map: Record<string, React.ReactElement> = {
      'generate-pin': <GeneratePin />,
      'users': <UsersOverview />,
      'pendingPayouts': <PendingPayouts />,
      'pendingWithdrawGC': <PendingWithdrawGC />,
    };
    return map[activeTab] ?? <div />;
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    navigate('/auth');
  };

  return (
    <div className="flex h-screen bg-white">

      {/* ── Sidebar ── */}
      <div className={`fixed lg:static inset-y-0 left-0 bg-white text-gray-900 z-40 transition-all duration-300 overflow-hidden border-r border-gray-100 ${sidebarOpen ? 'w-64' : 'w-0 lg:w-20'}`}>
        <div className="flex flex-col h-full">

          {/* logo */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h1 className={`text-xl text-gray-900 ${sidebarOpen ? 'block' : 'hidden'}`}>
              CoProfitGlobal.
            </h1>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
              <ChevronLeft className={`w-5 h-5 text-gray-600 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* nav */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            {menuItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setActiveTab(id); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition mb-1 ${activeTab === id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'} ${sidebarOpen ? 'justify-start' : 'justify-center'}`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span className="text-sm">{label}</span>}
              </button>
            ))}
          </nav>

          <div className={`border-t border-gray-100 p-4 space-y-3 ${sidebarOpen ? 'block' : 'hidden lg:flex lg:flex-col'}`}>

            {sidebarOpen ? (
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition font-medium text-sm">
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Logout</span>
              </button>
            ) : (
              <button onClick={handleLogout} className="w-full flex items-center justify-center p-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition">
                <LogOut className="w-4 h-4" />
              </button>
            )}
            {/* Copyright Footer */}
            <div className="px-4 py-2.5 bg-transparent text-center">
              <p className="text-[12px] text-gray-400 text-center leading-relaxed">
                v1.0.1 &nbsp;·&nbsp; © 2026 CoProfitGlobal.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard' ? <UnderDevelopmentContent /> : renderTabContent()}
        </div>
      </div>

      {/* mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}