import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Copy, RefreshCw, Eye, EyeOff, Download,
  FileSpreadsheet, FileText, File,
  ChevronDown,
} from 'lucide-react';
import { ExportModal } from './../../modals/ExportModal';

const API_BASE = 'https://coprofitglobal-production.up.railway.app';

interface PIN {
  id: string;
  pin: string;
  tier: Tier;
  createdAt: string;
  createdTime: string;
  status: 'UNUSED' | 'USED' | 'VOID';
  usedAt?: string;
  usedBy?: string;
}

type Tier = 'free' | 'bronze' | 'silver' | 'gold' | 'platinum';
type ExportFormat = 'excel' | 'word' | 'pdf';

const FREE_STATIC_PIN = 'AB1234';

function mapApiPin(r: any): PIN {
  const createdDate = r.createdAt ? new Date(r.createdAt) : new Date();
  const resolvedPin: string =
    r.pin && !r.pin.startsWith('$2')
      ? r.pin
      : '[hashed — void & regenerate]';
  return {
    id: r.id,
    pin: resolvedPin,
    tier: r.tier as Tier,
    createdAt: createdDate.toISOString().split('T')[0],
    createdTime: createdDate.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    }),
    status: r.status ?? 'UNUSED',
    usedAt: r.usedAt ?? undefined,
    usedBy: r.usedByUserId ?? undefined,
  };
}

// ─── Script loader ─────────────────────────────────────────────────────────────

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

// ─── Export helpers ────────────────────────────────────────────────────────────

function pinsToRows(pins: PIN[]): object[] {
  return pins.map((p) => ({
    PIN: p.pin,
    Tier: p.tier,
    Status: p.status,
    'Created Date': p.createdAt,
    'Created Time': p.createdTime,
    'Used At': p.usedAt ?? '',
    'Used By': p.usedBy ?? '',
  }));
}

async function exportToExcel(pins: PIN[], filename = 'pins-export') {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
  const XLSX = (window as any).XLSX;
  const ws = XLSX.utils.json_to_sheet(pinsToRows(pins));
  ws['!cols'] = [14, 12, 10, 14, 14, 20, 20].map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PINs');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

async function exportToWord(pins: PIN[], filename = 'pins-export') {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/docx/7.8.2/docx.umd.min.js');
  const {
    Document, Packer, Paragraph, Table, TableRow, TableCell,
    TextRun, WidthType, AlignmentType, HeadingLevel,
    ShadingType, BorderStyle,
  } = (window as any).docx;

  const COLS = ['PIN', 'Tier', 'Status', 'Created Date', 'Created Time', 'Used At', 'Used By'];
  const COL_W = [1600, 1100, 1200, 1500, 1500, 1900, 1900];

  const cellBorder = {
    top:    { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
    left:   { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
    right:  { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
  };

  const headerRow = new TableRow({
    tableHeader: true,
    children: COLS.map((col, i) =>
      new TableCell({
        width: { size: COL_W[i], type: WidthType.DXA },
        shading: { type: ShadingType.SOLID, color: '1E40AF', fill: '1E40AF' },
        borders: cellBorder,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: col, bold: true, color: 'FFFFFF', size: 18 })],
          }),
        ],
      })
    ),
  });

  const dataRows = pins.map((p, rowIdx) => {
    const values = [p.pin, p.tier, p.status, p.createdAt, p.createdTime, p.usedAt ?? '\u2014', p.usedBy ?? '\u2014'];
    const fill = rowIdx % 2 === 0 ? 'FFFFFF' : 'F3F4F6';
    return new TableRow({
      children: values.map((val, i) =>
        new TableCell({
          width: { size: COL_W[i], type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: fill, fill },
          borders: cellBorder,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: String(val), size: 16 })],
            }),
          ],
        })
      ),
    });
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: 'PIN Export Report', bold: true, size: 36, color: '1E40AF' })],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [new TextRun({
            text: `Generated: ${new Date().toLocaleString()}   |   Total: ${pins.length} PIN${pins.length !== 1 ? 's' : ''}`,
            size: 18, color: '6B7280',
          })],
        }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportToPdf(pins: PIN[], filename = 'pins-export') {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js');
  const { jsPDF } = (window as any).jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, 297, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PIN Export Report', 14, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Generated: ${new Date().toLocaleString()}  |  Total: ${pins.length} PIN${pins.length !== 1 ? 's' : ''}`,
    297 - 14, 13, { align: 'right' }
  );
  doc.autoTable({
    startY: 26,
    head: [['PIN', 'Tier', 'Status', 'Created Date', 'Created Time', 'Used At', 'Used By']],
    body: pins.map((p) => [p.pin, p.tier, p.status, p.createdAt, p.createdTime, p.usedAt ?? '—', p.usedBy ?? '—']),
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [243, 244, 246] },
    styles: { cellPadding: 3, lineColor: [229, 231, 235], lineWidth: 0.1 },
  });
  doc.save(`${filename}.pdf`);
}

async function runExport(pins: PIN[], format: ExportFormat) {
  const ts = new Date().toISOString().slice(0, 10);
  const name = `pins-export-${ts}`;
  if (format === 'excel') await exportToExcel(pins, name);
  else if (format === 'word') await exportToWord(pins, name);
  else await exportToPdf(pins, name);
}

// ─── Shared config ─────────────────────────────────────────────────────────────

const tierConfig: Record<Tier, { bg: string; text: string; ring: string; label: string }> = {
  free:     { bg: 'bg-slate-50',  text: 'text-slate-600',  ring: 'ring-slate-200',  label: 'Free'     },
  bronze:   { bg: 'bg-amber-50',  text: 'text-amber-700',  ring: 'ring-amber-200',  label: 'Bronze'   },
  silver:   { bg: 'bg-slate-50',  text: 'text-slate-500',  ring: 'ring-slate-300',  label: 'Silver'   },
  gold:     { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-200', label: 'Gold'     },
  platinum: { bg: 'bg-purple-50', text: 'text-purple-700', ring: 'ring-purple-200', label: 'Platinum' },
};

const statusConfig: Record<'UNUSED' | 'USED' | 'VOID', { bg: string; text: string; ring: string; dot: string; label: string }> = {
  UNUSED: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-400', label: 'Unused' },
  USED:   { bg: 'bg-red-50',     text: 'text-red-600',     ring: 'ring-red-200',     dot: 'bg-red-500',     label: 'Used'   },
  VOID:   { bg: 'bg-orange-50',  text: 'text-orange-600',  ring: 'ring-orange-200',  dot: 'bg-orange-400',  label: 'Void'   },
};

function isHashedPin(pin: string) { return pin.startsWith('[hashed'); }

// ─── Per-PIN export dropdown ───────────────────────────────────────────────────

function PinExportMenu({ pin }: { pin: PIN }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const doExport = async (fmt: ExportFormat) => {
    setBusy(fmt);
    setOpen(false);
    try { await runExport([pin], fmt); }
    catch (e) { console.error(e); }
    finally { setBusy(null); }
  };

  const items: { fmt: ExportFormat; label: string; icon: React.ReactNode }[] = [
    { fmt: 'excel', label: 'Excel (.xlsx)', icon: <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> },
    { fmt: 'word',  label: 'Word (.docx)',  icon: <FileText        className="w-4 h-4 text-blue-600"    /> },
    { fmt: 'pdf',   label: 'PDF (.pdf)',    icon: <File            className="w-4 h-4 text-red-500"     /> },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        disabled={!!busy}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:border-slate-400 rounded-lg px-2.5 py-1.5 transition-all"
        title="Export this PIN"
      >
        {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        Export
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-1 z-50 bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden w-44">
          {items.map(({ fmt, label, icon }) => (
            <button
              key={fmt}
              onClick={(e) => { e.stopPropagation(); doExport(fmt); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {icon}{label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PIN Card (compact) ────────────────────────────────────────────────────────

function PinCard({ pin, onClick }: { pin: PIN; onClick: () => void }) {
  const sc = statusConfig[pin.status];
  const tc = tierConfig[pin.tier];

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 cursor-pointer transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 group"
    >
      {/* Avatar + identity */}
      <div className="px-5 pt-6 pb-4 flex flex-col items-center text-center">
        <div className="relative mb-3">
          <div className="w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm font-mono tracking-widest">
            {isHashedPin(pin.pin) ? '??' : pin.pin.slice(0, 2).toUpperCase()}
          </div>
          {/* Status dot */}
          <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${sc.dot}`} />
        </div>

        {/* Masked PIN */}
        <h3 className="text-sm font-semibold text-slate-900 font-mono tracking-widest leading-tight">
          ••••••
        </h3>
        <p className="text-[10px] text-slate-400 mt-0.5">Click to reveal</p>

        {/* Tier badge */}
        <div className="mt-2.5">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 capitalize ${tc.bg} ${tc.text} ${tc.ring}`}>
            {tc.label}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 mx-5" />

      {/* Status */}
      <div className="px-4 py-4 flex justify-center">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${sc.bg} ${sc.text} ${sc.ring}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
          {sc.label}
        </span>
      </div>

      {/* Hint */}
      <div className="pb-3 text-center">
        <p className="text-[10px] text-slate-200 group-hover:text-slate-400 transition-colors">
          Click to view details
        </p>
      </div>
    </div>
  );
}

// ─── PIN Detail Modal ──────────────────────────────────────────────────────────

function PinDetailModal({ pin, onClose }: { pin: PIN; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  const sc = statusConfig[pin.status];
  const tc = tierConfig[pin.tier];

  const handleCopy = () => {
    navigator.clipboard.writeText(pin.pin);
    alert(`PIN ${pin.pin} copied to clipboard!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* ── Modal Header ── */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-4 shrink-0">
          {/* PIN avatar */}
          <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm font-mono tracking-widest shrink-0">
            {isHashedPin(pin.pin) ? '??' : pin.pin.slice(0, 2).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${sc.bg} ${sc.text} ${sc.ring}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {sc.label}
              </span>
              {/* Tier */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 capitalize ${tc.bg} ${tc.text} ${tc.ring}`}>
                {tc.label}
              </span>
              {isHashedPin(pin.pin) && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 ring-1 ring-red-200">
                  ⚠ Legacy hashed
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">ID: {pin.id}</p>
          </div>

          <div className="text-right hidden sm:block shrink-0">
            <p className="text-xs text-slate-400 mb-0.5">Created</p>
            <p className="text-sm font-medium text-slate-900">{pin.createdAt}</p>
            <p className="text-xs text-slate-400">{pin.createdTime}</p>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="overflow-y-auto flex-1">

          {/* PIN Value */}
          <div className="px-6 py-5 border-b border-slate-100">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">PIN Value</h4>
            <div className="bg-slate-50 rounded-xl border border-slate-100 px-5 py-4 flex items-center justify-between gap-4">
              <p className="text-2xl font-bold font-mono tracking-widest text-slate-900">
                {isHashedPin(pin.pin)
                  ? <span className="text-base text-red-500">{pin.pin}</span>
                  : visible ? pin.pin : '••••••'}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                {!isHashedPin(pin.pin) && (
                  <button
                    onClick={() => setVisible((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {visible ? 'Hide' : 'Reveal'}
                  </button>
                )}
                {visible && !isHashedPin(pin.pin) && (
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="px-6 py-5">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">PIN Details</h4>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Created Date', value: pin.createdAt },
                { label: 'Created Time', value: pin.createdTime },
                { label: 'Used At',      value: pin.usedAt },
                { label: 'Used By',      value: pin.usedBy },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>
                  <p className="text-sm text-slate-900 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 min-h-9 flex items-center">
                    {value ?? <span className="text-slate-300">—</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Modal Footer ── */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
          <PinExportMenu pin={pin} />
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

function GeneratePin() {
  const [pins, setPins] = useState<PIN[]>([]);
  const [selectedPin, setSelectedPin] = useState<PIN | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [displayCount, setDisplayCount] = useState(12);
  const [filterStatus, setFilterStatus] = useState<'all' | 'USED' | 'UNUSED' | 'VOID'>('all');
  const [filterTier, setFilterTier] = useState<Tier | 'all'>('all');
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tierFilterActiveClass: Record<string, string> = {
    all:      'bg-slate-900 text-white',
    free:     'bg-slate-500 text-white',
    bronze:   'bg-amber-500 text-white',
    silver:   'bg-slate-400 text-white',
    gold:     'bg-yellow-500 text-white',
    platinum: 'bg-purple-600 text-white',
  };

  const fetchPins = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/admin/pins?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load pins (${res.status})`);
      const data: any[] = await res.json();
      setPins(data.map((r) => mapApiPin(r)));
    } catch (err: any) {
      setError(err.message ?? 'Could not load pins');
    }
  }, []);

  useEffect(() => { fetchPins(); }, [fetchPins]);

  const handleConfirmGenerate = async () => {
    if (!selectedTier || selectedTier === 'free') return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/admin/pins/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tier: selectedTier, quantity }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `Server error (${res.status})`);
      }

      const data = await res.json();
      const rawPins: string[] = data.pins ?? [];
      const now = new Date();

      const newPins: PIN[] = rawPins.map((rawPin, i) => ({
        id: `temp-${Date.now()}-${i}`,
        pin: rawPin ?? 'N/A',
        tier: selectedTier,
        createdAt: now.toISOString().split('T')[0],
        createdTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        status: 'UNUSED',
      }));

      setPins((prev) => [...newPins, ...prev]);
      setShowGenerateModal(false);
      setSelectedTier(null);
      setQuantity(1);

      setTimeout(async () => {
        const token2 = localStorage.getItem('accessToken');
        const res2 = await fetch(`${API_BASE}/admin/pins?limit=200`, {
          headers: { Authorization: `Bearer ${token2}` },
        });
        if (!res2.ok) return;
        const list: any[] = await res2.json();
        setPins(list.map((r) => mapApiPin(r)));
      }, 600);
    } catch (err: any) {
      setError(err.message ?? 'Failed to generate PIN');
    } finally {
      setLoading(false);
    }
  };

  const filteredPins = pins.filter((pin) => {
    if (filterTier !== 'all' && pin.tier !== filterTier) return false;
    if (filterStatus === 'all') return true;
    return pin.status === filterStatus;
  });

  const displayedPins = filteredPins.slice(0, displayCount);

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-7xl mx-auto px-6 lg:px-21 py-10">

        {/* ── Header ── */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Generate PIN</h1>
            <p className="text-sm text-slate-400 mt-1">
              {pins.length} total PIN{pins.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchPins}
              className="text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors"
            >
              Refresh
            </button>
            {pins.length > 0 && (
              <button
                onClick={() => setShowExportModal(true)}
                className="text-xs font-medium bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors"
              >
                Bulk Export
              </button>
            )}
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button className="text-xs underline ml-4 shrink-0" onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {/* ── Tier Selection ── */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Select Tier</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
            <button
              onClick={() => setSelectedTier('free')}
              className={`rounded-2xl border p-4 text-left transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 ${
                selectedTier === 'free'
                  ? `${tierConfig.free.bg} ${tierConfig.free.ring} ring-1 border-transparent`
                  : 'bg-white border-slate-100 hover:border-slate-200'
              }`}
            >
              <p className={`text-sm font-semibold ${selectedTier === 'free' ? tierConfig.free.text : 'text-slate-700'}`}>Free</p>
              <p className="text-xs text-slate-400 mt-0.5">Static PIN</p>
              {selectedTier === 'free' && <span className="mt-2 inline-flex text-xs font-medium text-slate-500">✓ Selected</span>}
            </button>

            {(['bronze', 'silver', 'gold', 'platinum'] as Tier[]).map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`rounded-2xl border p-4 text-left transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 ${
                  selectedTier === tier
                    ? `${tierConfig[tier].bg} ${tierConfig[tier].ring} ring-1 border-transparent`
                    : 'bg-white border-slate-100 hover:border-slate-200'
                }`}
              >
                <p className={`text-sm font-semibold capitalize ${selectedTier === tier ? tierConfig[tier].text : 'text-slate-700'}`}>{tier}</p>
                {selectedTier === tier && <span className="mt-2 inline-flex text-xs font-medium text-slate-500">✓ Selected</span>}
              </button>
            ))}
          </div>

          {selectedTier === 'free' && (
            <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600">
              <p className="font-semibold text-slate-700 mb-0.5">Free Account — Static PIN</p>
              <p>
                The PIN for free accounts is fixed:{' '}
                <span className="font-mono font-bold tracking-widest text-slate-900">{FREE_STATIC_PIN}</span>
              </p>
              <p className="mt-1 text-slate-400 text-xs">Free accounts do not receive any bonus.</p>
            </div>
          )}
        </div>

        {/* ── Generate Button ── */}
        {selectedTier !== 'free' && (
          <div className="mb-8">
            <button
              onClick={() => setShowGenerateModal(true)}
              disabled={!selectedTier || loading}
              className={`inline-flex items-center gap-2 text-sm font-medium py-2.5 px-5 rounded-lg transition-colors ${
                selectedTier && !loading
                  ? 'bg-slate-900 hover:bg-slate-700 text-white cursor-pointer'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Generating…' : 'Generate PIN'}
            </button>
            {!selectedTier && <p className="text-xs text-red-500 mt-2">Please select a tier to generate a PIN</p>}
          </div>
        )}

        {/* ── Filters + PIN Grid ── */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Generated PINs</p>

          {pins.length > 0 && (
            <div className="mb-6 space-y-3">
              {/* Tier filters */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setFilterTier('all'); setDisplayCount(12); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterTier === 'all' ? tierFilterActiveClass.all : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  All Tiers
                </button>
                {(['free', 'bronze', 'silver', 'gold', 'platinum'] as Tier[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setFilterTier(t); setDisplayCount(12); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                      filterTier === t ? tierFilterActiveClass[t] : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Status filters */}
              <div className="flex flex-wrap gap-2">
                {(['all', 'UNUSED', 'USED', 'VOID'] as const).map((s) => {
                  const count = s === 'all' ? pins.length : pins.filter((p) => p.status === s).length;
                  const activeClass =
                    s === 'USED'   ? 'bg-red-500 text-white'
                    : s === 'VOID'   ? 'bg-orange-500 text-white'
                    : s === 'UNUSED' ? 'bg-emerald-600 text-white'
                    :                  'bg-slate-900 text-white';
                  return (
                    <button
                      key={s}
                      onClick={() => { setFilterStatus(s); setDisplayCount(12); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        filterStatus === s ? activeClass : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {s === 'all' ? `All (${count})` : `${s.charAt(0) + s.slice(1).toLowerCase()} (${count})`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cards */}
          {pins.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
              <p className="text-slate-400 text-sm">No PINs generated yet. Select a tier and click Generate PIN.</p>
            </div>
          ) : filteredPins.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
              <p className="text-slate-400 text-sm">No PINs match the selected filter.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {displayedPins.map((pin) => (
                  <PinCard key={pin.id} pin={pin} onClick={() => setSelectedPin(pin)} />
                ))}
              </div>

              {displayCount < filteredPins.length && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setDisplayCount(displayCount + 12)}
                    className="text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 px-6 py-2.5 rounded-xl transition-colors"
                  >
                    Show More ({filteredPins.length - displayCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── PIN Detail Modal ── */}
        {selectedPin && (
          <PinDetailModal pin={selectedPin} onClose={() => setSelectedPin(null)} />
        )}

        {/* ── Generate Confirmation Modal ── */}
        {showGenerateModal && selectedTier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => { setShowGenerateModal(false); setSelectedTier(null); setQuantity(1); }}
            />
            <div className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Generate {selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} PIN{quantity > 1 ? 's' : ''}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Confirm your generation details below</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 capitalize ${tierConfig[selectedTier].bg} ${tierConfig[selectedTier].text} ${tierConfig[selectedTier].ring}`}>
                  {tierConfig[selectedTier].label}
                </span>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                    Quantity of PINs
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition-colors"
                    >−</button>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
                      className="w-16 text-center border border-slate-200 rounded-lg py-1.5 text-sm font-semibold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                    <button
                      onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                      disabled={quantity >= 50}
                      className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition-colors"
                    >+</button>
                    <span className="text-xs text-slate-400 ml-1">(max 50)</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  Are you sure you want to generate{' '}
                  <span className="font-semibold text-slate-700">
                    {quantity > 1 ? `${quantity} new PINs` : 'a new PIN'}
                  </span>?
                </p>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
                <button
                  onClick={() => { setShowGenerateModal(false); setSelectedTier(null); setQuantity(1); }}
                  disabled={loading}
                  className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmGenerate}
                  disabled={loading}
                  className="text-sm px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {loading ? 'Generating…' : 'Yes, Generate'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Bulk Export Modal ── */}
        {showExportModal && (
          <ExportModal pins={filteredPins} onClose={() => setShowExportModal(false)} />
        )}
      </div>
    </div>
  );
}

export default GeneratePin;