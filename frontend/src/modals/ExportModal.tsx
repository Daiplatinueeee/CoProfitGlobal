import { useState } from 'react';
import {
  Download, RefreshCw, X,
  FileSpreadsheet, FileText, File,
  CheckSquare, Square, MinusSquare,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Format options ───────────────────────────────────────────────────────────

const FORMAT_OPTIONS: {
  id: ExportFormat;
  label: string;
  ext: string;
  icon: React.ReactNode;
  activeClass: string;
}[] = [
  {
    id: 'excel', label: 'Excel', ext: '.xlsx',
    icon: <FileSpreadsheet className="w-5 h-5" />,
    activeClass: 'border-emerald-500 bg-emerald-50 text-emerald-700',
  },
  {
    id: 'word', label: 'Word', ext: '.docx',
    icon: <FileText className="w-5 h-5" />,
    activeClass: 'border-blue-500 bg-blue-50 text-blue-700',
  },
  {
    id: 'pdf', label: 'PDF', ext: '.pdf',
    icon: <File className="w-5 h-5" />,
    activeClass: 'border-red-500 bg-red-50 text-red-700',
  },
];

// ─── Tier filter config ───────────────────────────────────────────────────────

type TierFilter = 'all' | 'bronze' | 'silver' | 'gold' | 'platinum';

const TIER_FILTERS: {
  id: TierFilter;
  label: string;
  activeClass: string;
  badgeClass: string;
}[] = [
  {
    id: 'all',
    label: 'All Tiers',
    activeClass: 'bg-blue-600 text-white border-blue-600',
    badgeClass: '',
  },
  {
    id: 'bronze',
    label: 'Bronze',
    activeClass: 'bg-amber-500 text-white border-amber-500',
    badgeClass: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'silver',
    label: 'Silver',
    activeClass: 'bg-slate-500 text-white border-slate-500',
    badgeClass: 'bg-slate-100 text-slate-700',
  },
  {
    id: 'gold',
    label: 'Gold',
    activeClass: 'bg-yellow-500 text-white border-yellow-500',
    badgeClass: 'bg-yellow-100 text-yellow-700',
  },
  {
    id: 'platinum',
    label: 'Platinum',
    activeClass: 'bg-purple-600 text-white border-purple-600',
    badgeClass: 'bg-purple-100 text-purple-700',
  },
];

// ─── Bulk Export Modal ────────────────────────────────────────────────────────

export interface ExportModalProps {
  pins: PIN[];
  onClose: () => void;
}

export function ExportModal({ pins, onClose }: ExportModalProps) {
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set(pins.map((p) => p.id)));
  const [format, setFormat] = useState<ExportFormat>('excel');
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  // Pins visible in the checklist based on the active tier filter
  // Note: 'free' tier is excluded from bulk export tier filters since it's a static PIN
  const visiblePins = tierFilter === 'all'
    ? pins
    : pins.filter((p) => p.tier === tierFilter);

  const allChecked = visiblePins.length > 0 && visiblePins.every((p) => selected.has(p.id));
  const someChecked = visiblePins.some((p) => selected.has(p.id)) && !allChecked;

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        visiblePins.forEach((p) => next.delete(p.id));
      } else {
        visiblePins.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleExport = async () => {
    const toExport = pins.filter((p) => selected.has(p.id));
    if (!toExport.length) return;
    setExporting(true);
    setDone(false);
    try {
      await runExport(toExport, format);
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  const tierBadge: Record<Tier, string> = {
    free: 'bg-gray-100 text-gray-600',
    bronze: 'bg-amber-100 text-amber-700',
    silver: 'bg-slate-100 text-slate-700',
    gold: 'bg-yellow-100 text-yellow-700',
    platinum: 'bg-purple-100 text-purple-700',
  };

  const statusDot = (s: PIN['status']) =>
    s === 'USED' ? 'text-red-600' : s === 'VOID' ? 'text-orange-600' : 'text-green-600';

  // Count how many pins per tier (for badge counts)
  const countForTier = (t: TierFilter) =>
    t === 'all' ? pins.length : pins.filter((p) => p.tier === t).length;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Modal header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-xl text-gray-900">Bulk Export</h2>
            <p className="text-sm text-gray-500 mt-0.5">Filter by tier, then check the PINs you want to include</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tier filter pills */}
        <div className="px-7 py-3 border-b border-gray-100 shrink-0 bg-gray-50/60">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Filter by Tier</p>
          <div className="flex flex-wrap gap-2">
            {TIER_FILTERS.map((tf) => {
              const count = countForTier(tf.id);
              const isActive = tierFilter === tf.id;
              return (
                <button
                  key={tf.id}
                  onClick={() => setTierFilter(tf.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                    isActive
                      ? tf.activeClass
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {tf.label}
                  <span
                    className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/25 text-inherit' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Select-all bar */}
        <div className="px-7 py-3 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/70">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors select-none"
          >
            {allChecked
              ? <CheckSquare className="w-4 h-4 text-blue-600" />
              : someChecked
                ? <MinusSquare className="w-4 h-4 text-blue-400" />
                : <Square className="w-4 h-4 text-gray-400" />}
            {allChecked ? 'Deselect visible' : 'Select visible'}
          </button>
          <span className="text-xs font-medium text-gray-500">
            {selected.size} / {pins.length} selected
          </span>
        </div>

        {/* Checklist */}
        <div className="overflow-y-auto flex-1 px-5 py-3">
          {visiblePins.length === 0 ? (
            <p className="text-center text-gray-400 py-10 text-sm">
              No PINs found for this tier.
            </p>
          ) : (
            <div className="space-y-1.5">
              {visiblePins.map((p) => {
                const checked = selected.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleOne(p.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                      checked
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {/* Checkbox icon */}
                    <span className="shrink-0">
                      {checked
                        ? <CheckSquare className="w-4 h-4 text-blue-600" />
                        : <Square className="w-4 h-4 text-gray-300" />}
                    </span>

                    {/* PIN */}
                    <span className="font-mono font-semibold text-sm text-gray-900 w-20 shrink-0 truncate">
                      {p.pin.startsWith('[hashed') ? '(hashed)' : p.pin}
                    </span>

                    {/* Tier badge */}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 ${tierBadge[p.tier]}`}>
                      {p.tier}
                    </span>

                    {/* Status */}
                    <span className={`text-xs font-medium shrink-0 ${statusDot(p.status)}`}>
                      {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                    </span>

                    {/* Date — pushed right */}
                    <span className="ml-auto text-xs text-gray-400 shrink-0">{p.createdAt}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Format + export action */}
        <div className="px-7 py-5 border-t border-gray-100 shrink-0 space-y-4 bg-white rounded-b-2xl">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">File format</p>
            <div className="grid grid-cols-3 gap-3">
              {FORMAT_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={`rounded-xl border-2 p-3 flex flex-col items-center gap-1.5 transition-all ${
                    format === f.id
                      ? f.activeClass
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {f.icon}
                  <span className="text-xs font-semibold">{f.label}</span>
                  <span className="text-[10px] opacity-60">{f.ext}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting || selected.size === 0}
            className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              done
                ? 'bg-green-600 text-white'
                : exporting
                  ? 'bg-blue-400 text-white cursor-not-allowed'
                  : selected.size === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {done ? (
              '✓ Downloaded!'
            ) : exporting ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Exporting…</>
            ) : (
              <><Download className="w-4 h-4" /> Export {selected.size} PIN{selected.size !== 1 ? 's' : ''}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportModal;