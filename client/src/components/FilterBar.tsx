import clsx from 'clsx';

export type TierFilter = 'all' | 'small' | 'medium' | 'large' | 'amphi';

type FilterBarProps = {
  tier: TierFilter;
  onTierChange: (tier: TierFilter) => void;
  zone: string | undefined;
  zones: string[];
  onZoneChange: (zone: string | undefined) => void;
};

const TIERS: { value: TierFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'amphi', label: 'Amphi' },
];

export function FilterBar({
  tier,
  onTierChange,
  zone,
  zones,
  onZoneChange,
}: FilterBarProps) {
  return (
    <div className="space-y-3">
      {/* Tier chips */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          {TIERS.map((t) => (
            <button
              key={t.value}
              onClick={() => onTierChange(t.value)}
              className={clsx(
                'shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
                tier === t.value
                  ? 'bg-[#0F766E] text-white'
                  : 'bg-white text-[#1F2937] border border-[#DCE1E7] hover:bg-[#F4F6F8]'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Zone dropdown */}
      <select
        value={zone ?? ''}
        onChange={(e) => onZoneChange(e.target.value || undefined)}
        className="h-9 w-full rounded-md border border-[#DCE1E7] bg-white px-3 text-sm text-[#1F2937] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
      >
        <option value="">All zones</option>
        {zones.map((z) => (
          <option key={z} value={z}>
            {z}
          </option>
        ))}
      </select>
    </div>
  );
}