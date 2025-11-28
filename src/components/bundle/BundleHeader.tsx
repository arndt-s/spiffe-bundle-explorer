import { Globe, Hash, Clock, Key } from 'lucide-react';
import { formatDuration } from '../../utils/certificateParser';
import type { SPIFFEBundle, ParsedJWK, ParsedX509SVID } from '../../types';

interface BundleHeaderProps {
  trustDomain?: string;
  bundle: SPIFFEBundle;
  jwtKeys: ParsedJWK[];
  x509Keys: ParsedX509SVID[];
  witKeys: ParsedJWK[];
}

export function BundleHeader({
  trustDomain,
  bundle,
  jwtKeys,
  x509Keys,
  witKeys,
}: BundleHeaderProps) {
  const totalKeys = jwtKeys.length + x509Keys.length + witKeys.length;

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {trustDomain && (
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-gray-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Trust Domain</div>
              <div className="text-lg font-semibold text-gray-900 break-all">{trustDomain}</div>
            </div>
          </div>
        )}

        {bundle.spiffe_sequence !== undefined && (
          <div className="flex items-center gap-3 group relative">
            <Hash className="w-6 h-6 text-gray-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Sequence</div>
              <div className="text-lg font-semibold text-gray-900">
                {bundle.spiffe_sequence.toLocaleString()}
              </div>
            </div>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
              Monotonically increasing version number
            </div>
          </div>
        )}

        {bundle.spiffe_refresh_hint !== undefined && (
          <div className="flex items-center gap-3 group relative">
            <Clock className="w-6 h-6 text-gray-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Refresh Hint</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatDuration(bundle.spiffe_refresh_hint)}
              </div>
            </div>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
              Suggested consumer refresh interval
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Key className="w-6 h-6 text-gray-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Total Keys</div>
            <div className="text-lg font-semibold text-gray-900">
              {totalKeys}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
