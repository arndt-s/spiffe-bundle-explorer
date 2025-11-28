import { format } from 'date-fns';
import type { ParsedCertificate } from '../../types';

interface CertificateTimelineProps {
  certificates: ParsedCertificate[];
  onCertificateClick?: (cert: ParsedCertificate) => void;
}

export function CertificateTimeline({
  certificates,
  onCertificateClick,
}: CertificateTimelineProps) {
  if (certificates.length === 0) {
    return null;
  }

  // Find the min and max dates across all certificates
  const allDates = certificates.flatMap((cert) => [
    cert.validFrom.getTime(),
    cert.validUntil.getTime(),
  ]);
  const minDate = Math.min(...allDates);
  const maxDate = Math.max(...allDates);
  const now = Date.now();

  // Add padding to the timeline (10% on each side)
  const range = maxDate - minDate;
  const padding = range * 0.1;
  const timelineStart = minDate - padding;
  const timelineEnd = maxDate + padding;
  const timelineRange = timelineEnd - timelineStart;

  // Calculate position percentage
  const getPositionPercent = (timestamp: number): number => {
    return ((timestamp - timelineStart) / timelineRange) * 100;
  };

  const nowPosition = getPositionPercent(now);

  // Get status color classes
  const getStatusBarColor = (status: string): string => {
    switch (status) {
      case 'valid':
        return 'bg-green-500';
      case 'expiring-soon':
        return 'bg-yellow-500';
      case 'expired':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusTextColor = (status: string): string => {
    switch (status) {
      case 'valid':
        return 'text-green-600';
      case 'expiring-soon':
        return 'text-yellow-600';
      case 'expired':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Format time remaining
  const formatTimeRemaining = (cert: ParsedCertificate): string => {
    if (cert.daysRemaining === null) {
      const daysAgo = Math.floor(
        (now - cert.validUntil.getTime()) / (1000 * 60 * 60 * 24)
      );
      return `expired ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`;
    }

    if (cert.daysRemaining > 365) {
      const years = Math.floor(cert.daysRemaining / 365);
      return `${years} year${years !== 1 ? 's' : ''} remaining`;
    }

    if (cert.daysRemaining > 30) {
      const months = Math.floor(cert.daysRemaining / 30);
      return `${months} month${months !== 1 ? 's' : ''} remaining`;
    }

    return `${cert.daysRemaining} day${cert.daysRemaining !== 1 ? 's' : ''} remaining`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Certificate Timeline</h3>

      <div className="relative">
        <div className="relative">
          <div className="relative h-12">
          </div>
        </div>

        <div
          className="absolute w-1 bg-gray-500 -ml-0.5 rounded-full shadow-md pointer-events-none z-0"
          style={{ left: `${nowPosition}%`, top: '2rem', bottom: 0 }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-500 rounded-full border-2 border-white shadow-lg"></div>
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className="inline-block px-2.5 py-0.5 text-xs font-semibold text-white bg-gray-500 rounded-full shadow-md">
              NOW
            </span>
          </div>
        </div>

        <div className="space-y-6 relative z-10">
        {certificates.map((cert, index) => {
          const startPercent = getPositionPercent(cert.validFrom.getTime());
          const endPercent = getPositionPercent(cert.validUntil.getTime());
          const widthPercent = endPercent - startPercent;

          return (
            <div
              key={`${cert.serialNumber}-${index}`}
              className="space-y-2"
            >
              <div className="text-sm font-mono text-gray-700 relative z-10 truncate max-w-full" title={cert.subject}>
                <span className="bg-white">{cert.subject}</span>
              </div>
              <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 bottom-0 ${getStatusBarColor(cert.status)} rounded-full cursor-pointer transition-opacity hover:opacity-80`}
                  style={{
                    left: `${startPercent}%`,
                    width: `${widthPercent}%`,
                  }}
                  onClick={() => onCertificateClick?.(cert)}
                  title={`${format(cert.validFrom, 'yyyy-MM-dd')} to ${format(cert.validUntil, 'yyyy-MM-dd')}`}
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-4 text-xs">
                <span className="font-mono text-gray-600">
                  Valid: {format(cert.validFrom, 'yyyy-MM-dd')} to{' '}
                  {format(cert.validUntil, 'yyyy-MM-dd')}
                </span>
                <span className={`font-semibold ${getStatusTextColor(cert.status)}`}>
                  ({formatTimeRemaining(cert)})
                </span>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
