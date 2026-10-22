import { PERIOD_OPTIONS, type PeriodPreset } from '@/lib/period';
import { cn } from '@/lib/utils';

export interface PeriodValue {
  preset: PeriodPreset;
  customFrom: string; // yyyy-MM-dd
  customTo: string;   // yyyy-MM-dd
}

/** Chọn kỳ thống kê: Hôm nay / 7 ngày / Tháng này ... / Tùy chọn (từ ngày – đến ngày). */
export function PeriodPicker({ value, onChange, exclude = [] }: { value: PeriodValue; onChange: (v: PeriodValue) => void; exclude?: PeriodPreset[] }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PERIOD_OPTIONS.filter(o => !exclude.includes(o.id)).map(o => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange({ ...value, preset: o.id })}
            aria-pressed={value.preset === o.id}
            className={cn(
              'px-3 py-1.5 rounded-xl text-sm font-bold border-2 border-black transition-all',
              value.preset === o.id ? 'bg-[#FEF08A] shadow-[2px_2px_0_#000]' : 'bg-white hover:bg-slate-100'
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      {value.preset === 'CUSTOM' && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1.5">
            <span className="font-semibold">Từ</span>
            <input
              type="date"
              value={value.customFrom}
              max={value.customTo || undefined}
              onChange={e => onChange({ ...value, customFrom: e.target.value })}
              className="h-9 px-2 rounded-lg border-2 border-slate-800 bg-white text-base sm:text-sm"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="font-semibold">đến</span>
            <input
              type="date"
              value={value.customTo}
              min={value.customFrom || undefined}
              onChange={e => onChange({ ...value, customTo: e.target.value })}
              className="h-9 px-2 rounded-lg border-2 border-slate-800 bg-white text-base sm:text-sm"
            />
          </label>
        </div>
      )}
    </div>
  );
}
