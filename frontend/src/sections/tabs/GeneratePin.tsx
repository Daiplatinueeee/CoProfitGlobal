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

// ─── Script loader ────────────────────────────────────────────────────────────

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

// ─── Export helpers ───────────────────────────────────────────────────────────

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
    top: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
    left: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
    right: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
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
    const values = [
      p.pin, p.tier, p.status,
      p.createdAt, p.createdTime,
      p.usedAt ?? '\u2014', p.usedBy ?? '\u2014',
    ];
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
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({ text: 'PIN Export Report', bold: true, size: 36, color: '1E40AF' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: `Generated: ${new Date().toLocaleString()}   |   Total: ${pins.length} PIN${pins.length !== 1 ? 's' : ''}`,
                size: 18,
                color: '6B7280',
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
          }),
        ],
      },
    ],
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
    body: pins.map((p) => [
      p.pin, p.tier, p.status,
      p.createdAt, p.createdTime,
      p.usedAt ?? '—', p.usedBy ?? '—',
    ]),
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

// ─── Per-PIN export dropdown ──────────────────────────────────────────────────

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
    try {
      await runExport([pin], fmt);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(null);
    }
  };

  const items: { fmt: ExportFormat; label: string; icon: React.ReactNode }[] = [
    { fmt: 'excel', label: 'Excel (.xlsx)', icon: <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> },
    { fmt: 'word', label: 'Word (.docx)', icon: <FileText className="w-4 h-4 text-blue-600" /> },
    { fmt: 'pdf', label: 'PDF (.pdf)', icon: <File className="w-4 h-4 text-red-500" /> },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={!!busy}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 bg-white border border-gray-200 hover:border-gray-400 rounded-lg px-2.5 py-1.5 transition-all"
        title="Export this PIN"
      >
        {busy
          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          : <Download className="w-3.5 h-3.5" />}
        Export
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-40 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden w-44">
          {items.map(({ fmt, label, icon }) => (
            <button
              key={fmt}
              onClick={() => doExport(fmt)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function GeneratePin() {
  const [pins, setPins] = useState<PIN[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [displayCount, setDisplayCount] = useState(5);
  const [filterStatus, setFilterStatus] = useState<'all' | 'USED' | 'UNUSED' | 'VOID'>('all');
  const [filterTier, setFilterTier] = useState<Tier | 'all'>('all');
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visiblePins, setVisiblePins] = useState<Set<string>>(new Set());

  const togglePinVisibility = (id: string) => {
    setVisiblePins((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const tierColors: Record<Tier, { bg: string; border: string; text: string }> = {
    free: { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-600' },
    bronze: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    silver: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' },
    gold: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
    platinum: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
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
      const tempIds: string[] = rawPins.map((_, i) => `temp-${Date.now()}-${i}`);

      const newPins: PIN[] = rawPins.map((rawPin, i) => ({
        id: tempIds[i],
        pin: rawPin ?? 'N/A',
        tier: selectedTier,
        createdAt: now.toISOString().split('T')[0],
        createdTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        status: 'UNUSED',
      }));

      setVisiblePins((prev) => {
        const next = new Set(prev);
        tempIds.forEach((id) => next.add(id));
        return next;
      });
      setPins((prev) => [...newPins, ...prev]);
      setShowModal(false);
      setSelectedTier(null);
      setQuantity(1);

      setTimeout(async () => {
        const token2 = localStorage.getItem('accessToken');
        const res2 = await fetch(`${API_BASE}/admin/pins?limit=200`, {
          headers: { Authorization: `Bearer ${token2}` },
        });
        if (!res2.ok) return;
        const list: any[] = await res2.json();
        const mapped = list.map((r) => mapApiPin(r));
        setVisiblePins((prev) => {
          const next = new Set(prev);
          tempIds.forEach((id) => next.delete(id));
          mapped.slice(0, rawPins.length).forEach((p) => next.add(p.id));
          return next;
        });
        setPins(mapped);
      }, 600);
    } catch (err: any) {
      setError(err.message ?? 'Failed to generate PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    alert(`PIN ${pin} copied to clipboard!`);
  };

  const getFilteredPins = (): PIN[] =>
    pins.filter((pin) => {
      if (filterTier !== 'all' && pin.tier !== filterTier) return false;
      if (filterStatus === 'all') return true;
      return pin.status === filterStatus;
    });

  const filteredPins = getFilteredPins();
  const displayedPins = filteredPins.slice(0, displayCount);

  const isHashedPin = (pin: string) => pin.startsWith('[hashed');

  const statusLabel = (pin: PIN) => {
    if (pin.status === 'USED') return `Used${pin.usedAt ? ` (${pin.usedAt})` : ''}`;
    if (pin.status === 'VOID') return 'Void';
    return 'Unused';
  };

  const statusColor = (pin: PIN) =>
    pin.status === 'USED' ? 'text-red-700' : pin.status === 'VOID' ? 'text-orange-700' : 'text-green-700';

  const cardBg = (pin: PIN) =>
    pin.status === 'USED'
      ? 'bg-red-50 border-red-200'
      : pin.status === 'VOID'
        ? 'bg-orange-50 border-orange-200'
        : 'bg-green-50 border-green-200';

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl text-gray-900">Generate PIN</h1>
          <p className="text-gray-600 mt-2">Create and manage membership PINs</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button className="underline ml-4" onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {/* Tier Selection */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Tier</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <button
              onClick={() => setSelectedTier('free')}
              className={`p-4 rounded-lg border-2 transition-all ${selectedTier === 'free'
                ? `${tierColors.free.bg} ${tierColors.free.border}`
                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
            >
              <div className={`font-semibold capitalize ${selectedTier === 'free' ? tierColors.free.text : 'text-gray-700'}`}>Free</div>
              <div className="mt-1 text-xs text-gray-500">Static PIN</div>
              {selectedTier === 'free' && <div className="mt-2 text-sm text-blue-600 font-medium">✓ Selected</div>}
            </button>

            {(['bronze', 'silver', 'gold', 'platinum'] as Tier[]).map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`p-4 rounded-lg border-2 transition-all ${selectedTier === tier
                  ? `${tierColors[tier].bg} ${tierColors[tier].border}`
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className={`font-semibold capitalize ${selectedTier === tier ? tierColors[tier].text : 'text-gray-700'}`}>{tier}</div>
                {selectedTier === tier && <div className="mt-2 text-sm text-blue-600 font-medium">✓ Selected</div>}
              </button>
            ))}
          </div>

          {selectedTier === 'free' && (
            <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700">
              <p className="font-semibold mb-1">Free Account — Static PIN</p>
              <p>
                The PIN for free accounts is fixed:{' '}
                <span className="font-mono font-bold tracking-widest text-gray-900">{FREE_STATIC_PIN}</span>
              </p>
              <p className="mt-1 text-gray-500">Free accounts do not receive any bonus.</p>
            </div>
          )}
        </div>

        {/* Generate Button */}
        {selectedTier !== 'free' && (
          <div className="mb-12">
            <button
              onClick={() => setShowModal(true)}
              disabled={!selectedTier || loading}
              className={`font-medium py-3 px-6 rounded-lg transition-colors flex items-center gap-2 ${selectedTier && !loading
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Generating…' : 'Generate PIN'}
            </button>
            {!selectedTier && <p className="text-sm text-red-600 mt-2">Please select a tier to generate a PIN</p>}
          </div>
        )}

        {/* PIN List */}
        <div>
          <div className="flex flex-col gap-4 mb-6">

            {/* Header row */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-semibold text-gray-900">Generated PINs</h2>
              {pins.length > 0 && (
                <button
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-2 hover:gap-3 bg-transparent hover:bg-gray-100 border border-gray-300 text-gray-900 text-sm font-medium py-2 px-4 rounded-xl transition-all"
                >
                  Bulk Export
                </button>
              )}
            </div>

            {pins.length > 0 && (
              <div className="space-y-3">
                {/* Tier filters */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => { setFilterTier('all'); setDisplayCount(5); }}
                    className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${filterTier === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                  >
                    All Tiers
                  </button>
                  {(['free', 'bronze', 'silver', 'gold', 'platinum'] as Tier[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setFilterTier(t); setDisplayCount(5); }}
                      className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors capitalize ${filterTier === t
                        ? `${tierColors[t].bg} ${tierColors[t].text} border ${tierColors[t].border}`
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Status filters */}
                <div className="flex gap-2 flex-wrap">
                  {(['all', 'UNUSED', 'USED', 'VOID'] as const).map((s) => {
                    const count = s === 'all' ? pins.length : pins.filter((p) => p.status === s).length;
                    const activeClass =
                      s === 'USED' ? 'bg-red-600 text-white'
                        : s === 'VOID' ? 'bg-orange-600 text-white'
                          : s === 'UNUSED' ? 'bg-green-600 text-white'
                            : 'bg-blue-600 text-white';
                    return (
                      <button
                        key={s}
                        onClick={() => { setFilterStatus(s); setDisplayCount(5); }}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStatus === s ? activeClass : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                      >
                        {s === 'all' ? `All (${count})` : `${s.charAt(0) + s.slice(1).toLowerCase()} (${count})`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {pins.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-12 border border-gray-200 text-center">
              <p className="text-gray-600">No PINs generated yet. Select a tier and click Generate PIN.</p>
            </div>
          ) : filteredPins.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-12 border border-gray-200 text-center">
              <p className="text-gray-600">No PINs match the selected filter.</p>
            </div>
          ) : (
            <div>
              <div className="space-y-4">
                {displayedPins.map((pinItem) => (
                  <div key={pinItem.id} className={`rounded-xl p-6 border ${cardBg(pinItem)}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize ${tierColors[pinItem.tier].bg} ${tierColors[pinItem.tier].text}`}>
                        {pinItem.tier}
                      </span>
                      {isHashedPin(pinItem.pin) && (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                          ⚠ Legacy hashed — void &amp; regenerate
                        </span>
                      )}
                    </div>

                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg">
                            PIN:{' '}
                            <span className="font-mono tracking-widest">
                              {isHashedPin(pinItem.pin)
                                ? pinItem.pin
                                : visiblePins.has(pinItem.id)
                                  ? pinItem.pin
                                  : '••••••'}
                            </span>
                          </h3>
                          {!isHashedPin(pinItem.pin) && (
                            <button
                              onClick={() => togglePinVisibility(pinItem.id)}
                              className="text-gray-500 hover:text-gray-700 transition-colors"
                              title={visiblePins.has(pinItem.id) ? 'Hide PIN' : 'Show PIN'}
                            >
                              {visiblePins.has(pinItem.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          )}
                          {visiblePins.has(pinItem.id) && !isHashedPin(pinItem.pin) && (
                            <button
                              onClick={() => handleCopyPin(pinItem.pin)}
                              className="text-blue-600 hover:text-blue-700 transition-colors"
                              title="Copy PIN"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className={`text-sm font-medium ${statusColor(pinItem)}`}>{statusLabel(pinItem)}</p>
                      </div>

                      {/* Individual export dropdown */}
                      <PinExportMenu pin={pinItem} />
                    </div>

                    <div className="bg-white rounded-lg p-5 mt-4 border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-gray-600 text-xs font-medium mb-1">Created Date</p>
                          <p className="font-medium text-gray-900">{pinItem.createdAt}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-xs font-medium mb-1">Created Time</p>
                          <p className="font-medium text-gray-900">{pinItem.createdTime}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-xs font-medium mb-1">Status</p>
                          <p className={`font-medium ${statusColor(pinItem)}`}>{statusLabel(pinItem)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-xs font-medium mb-1">Used By</p>
                          <p className="font-medium text-gray-900">{pinItem.usedBy || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {displayCount < filteredPins.length && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setDisplayCount(displayCount + 5)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                  >
                    Show More ({filteredPins.length - displayCount} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Generate Confirmation Modal */}
        {showModal && selectedTier && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8">
              <h2 className="text-2xl text-gray-900 mb-4">
                Generate {selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} PIN{quantity > 1 ? 's' : ''}
              </h2>
              <div className={`rounded-lg p-3 mb-6 ${tierColors[selectedTier].bg} ${tierColors[selectedTier].border} border`}>
                <p className={`text-sm font-semibold capitalize ${tierColors[selectedTier].text}`}>Tier: {selectedTier}</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity of PINs</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-9 h-9 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-gray-700 transition-colors"
                  >−</button>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
                    className="w-16 text-center border border-gray-300 rounded-lg py-1.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                    disabled={quantity >= 50}
                    className="w-9 h-9 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-gray-700 transition-colors"
                  >+</button>
                  <span className="text-xs text-gray-500 ml-1">(max 50)</span>
                </div>
              </div>

              <p className="text-gray-600 mb-8">
                Are you sure you want to generate {quantity > 1 ? `${quantity} new PINs` : 'a new PIN'}?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowModal(false); setSelectedTier(null); setQuantity(1); }}
                  disabled={loading}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors"
                >Cancel</button>
                <button
                  onClick={handleConfirmGenerate}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {loading ? 'Generating…' : 'Yes, Generate'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Export Modal — imported from ExportModal.tsx */}
        {showExportModal && (
          <ExportModal
            pins={filteredPins}
            onClose={() => setShowExportModal(false)}
          />
        )}
      </div>
    </div>
  );
}

export default GeneratePin;