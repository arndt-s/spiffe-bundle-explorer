import { Globe } from 'lucide-react';
import type { ParsedBundleEntry } from '../../types';

interface TrustDomainSelectorProps {
  entries: ParsedBundleEntry[];
  selected: string;
  onSelect: (trustDomain: string) => void;
}

export function TrustDomainSelector({
  entries,
  selected,
  onSelect,
}: TrustDomainSelectorProps) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-5 h-5 text-gray-600" />
        <span className="text-xs text-gray-500 uppercase font-semibold">
          Trust Domains
        </span>
        <span className="text-xs text-gray-400">({entries.length})</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {entries.map((entry) => {
          const total = entry.jwtKeys.length + entry.x509Keys.length + entry.witKeys.length;
          const isActive = entry.trustDomain === selected;
          return (
            <button
              key={entry.trustDomain}
              onClick={() => onSelect(entry.trustDomain)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400 hover:bg-primary-50'
              }`}
            >
              <span className="break-all">{entry.trustDomain}</span>
              <span
                className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {total}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
