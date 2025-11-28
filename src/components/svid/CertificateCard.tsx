import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { formatSerialNumber } from '../../utils/certificateParser';
import { Button } from '../Button';
import { CopyButton } from '../CopyButton';
import { DownloadButton } from '../DownloadButton';
import { Label } from '../Label';
import type { ParsedCertificate } from '../../types';

interface CertificateCardProps {
  certificate: ParsedCertificate;
}

const StatusBadge = ({ status, daysRemaining, validUntil }: { status: string; daysRemaining: number | null; validUntil: Date }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'valid':
        return { icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-300' };
      case 'expiring-soon':
        return { icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
      case 'expired':
        return { icon: XCircle, color: 'bg-red-100 text-red-800 border-red-300' };
      default:
        return { icon: AlertTriangle, color: 'bg-gray-100 text-gray-800 border-gray-300' };
    }
  };

  const formatStatusText = () => {
    if (daysRemaining === null) {
      const daysAgo = Math.floor((Date.now() - validUntil.getTime()) / (1000 * 60 * 60 * 24));
      return `Expired ${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago`;
    }
    if (daysRemaining > 365) {
      const years = Math.floor(daysRemaining / 365);
      return `${years} ${years === 1 ? 'year' : 'years'} remaining`;
    }
    if (daysRemaining > 30) {
      const months = Math.floor(daysRemaining / 30);
      return `${months} ${months === 1 ? 'month' : 'months'} remaining`;
    }
    return `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining`;
  };

  const { icon: Icon, color } = getStatusConfig();
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-semibold ${color}`}>
      <Icon className="w-3 h-3" /> {formatStatusText()}
    </span>
  );
};

const InfoRow = ({ label, value, mono = false }: { label: string; value: string | React.ReactNode; mono?: boolean }) => (
  <div className="flex gap-3">
    <span className="text-xs font-semibold text-gray-500 min-w-[70px] flex-shrink-0">{label}</span>
    <span className={`text-xs text-gray-900 break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
  </div>
);

export function CertificateCard({ certificate: cert }: CertificateCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDownload = () => {
    const blob = new Blob([cert.pemEncoded], { type: 'application/x-pem-file' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-${cert.serialNumber}.pem`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const hasMultipleURISans = cert.subjectAltNames.filter((san) => san.type === 'URI').length > 1;
  const keyUsageFlags = [
    { key: 'digitalSignature', label: 'Digital Signature' },
    { key: 'keyEncipherment', label: 'Key Encipherment' },
    { key: 'keyAgreement', label: 'Key Agreement' },
    { key: 'keyCertSign', label: 'Key Cert Sign' },
    { key: 'crlSign', label: 'CRL Sign' },
  ].filter((flag) => cert.keyUsage[flag.key as keyof typeof cert.keyUsage]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-base font-mono font-semibold text-primary-700 truncate">{cert.spiffeId}</h3>
              <StatusBadge status={cert.status} daysRemaining={cert.daysRemaining} validUntil={cert.validUntil} />
              <Label text={`${cert.publicKeyAlgorithm} ${cert.publicKeySize}`} color="gray" />
            </div>
            <div className="space-y-1.5">
              <InfoRow label="Subject" value={cert.subject} />
              <InfoRow label="Serial" value={formatSerialNumber(cert.serialNumber)} mono />
              <InfoRow 
                label="Validity" 
                value={`${format(cert.validFrom, 'yyyy-MM-dd HH:mm')} → ${format(cert.validUntil, 'yyyy-MM-dd HH:mm')} UTC`} 
                mono 
              />
            </div>
          </div>
          <div className="flex gap-2 items-start">
            <CopyButton label="Copy PEM" content={cert.pemEncoded} className="text-xs px-2 py-1" />
            <DownloadButton label="Download PEM" onClick={handleDownload} className="text-xs px-2 py-1" />
            <Button 
              label={isExpanded ? 'Collapse' : 'Expand'}
              onClick={() => setIsExpanded(!isExpanded)}
              trailingIcon={isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              className="text-xs px-2 py-1"
            />
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Identity & Issuer */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">Identity</h4>
            <InfoRow label="Issuer" value={cert.issuer} />
            <InfoRow label="Algorithm" value={cert.signatureAlgorithm} />
          </div>

          {/* Key Identifiers */}
          {(cert.subjectKeyIdentifier || cert.authorityKeyIdentifier) && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">Key Identifiers</h4>
              {cert.subjectKeyIdentifier && (
                <InfoRow label="SKID" value={cert.subjectKeyIdentifier} mono />
              )}
              {cert.authorityKeyIdentifier && (
                <InfoRow label="AKID" value={cert.authorityKeyIdentifier} mono />
              )}
            </div>
          )}

          {/* Subject Alternative Names */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">Subject Alternative Names</h4>
            {hasMultipleURISans && (
              <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                <span>Multiple URI SANs - SPIFFE spec violation</span>
              </div>
            )}
            <div className="space-y-1.5">
              {cert.subjectAltNames.map((san, idx) => (
                <InfoRow key={idx} label={san.type} value={san.value} mono />
              ))}
            </div>
          </div>

          {/* Key Usage & Constraints */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">
                Key Usage {cert.keyUsage.critical && <span className="text-red-600">(Critical)</span>}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {keyUsageFlags.map((flag) => (
                  <Label key={flag.key} text={flag.label} color="blue" />
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">
                Basic Constraints {cert.basicConstraints.critical && <span className="text-red-600">(Critical)</span>}
              </h4>
              <div className="space-y-1">
                <InfoRow label="CA" value={cert.basicConstraints.cA ? 'true' : 'false'} />
                {cert.basicConstraints.pathLenConstraint !== null && (
                  <InfoRow label="Path Length" value={cert.basicConstraints.pathLenConstraint.toString()} />
                )}
              </div>
            </div>
          </div>

          {/* Extended Key Usage */}
          {cert.extendedKeyUsage.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">Extended Key Usage</h4>
              <div className="flex flex-wrap gap-1.5">
                {cert.extendedKeyUsage.map((usage) => (
                  <Label key={usage} text={usage} color="primary" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
