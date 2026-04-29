import * as x509 from '@peculiar/x509';
import type {
  ParsedCertificate,
  KeyUsage,
  BasicConstraints,
  SubjectAltName,
  CertificateStatus,
} from '../types';

x509.cryptoProvider.set(globalThis.crypto);

// RFC 5280 KeyUsage bit values as encoded by @peculiar/x509's KeyUsageFlags.
const KEY_USAGE_DIGITAL_SIGNATURE = 1 << 0;
const KEY_USAGE_KEY_ENCIPHERMENT = 1 << 2;
const KEY_USAGE_KEY_AGREEMENT = 1 << 4;
const KEY_USAGE_KEY_CERT_SIGN = 1 << 5;
const KEY_USAGE_CRL_SIGN = 1 << 6;

const EKU_OID_NAMES: Record<string, string> = {
  '1.3.6.1.5.5.7.3.1': 'TLS Server Authentication',
  '1.3.6.1.5.5.7.3.2': 'TLS Client Authentication',
  '1.3.6.1.5.5.7.3.3': 'Code Signing',
  '1.3.6.1.5.5.7.3.4': 'Email Protection',
  '1.3.6.1.5.5.7.3.8': 'Time Stamping',
  '1.3.6.1.5.5.7.3.9': 'OCSP Signing',
};

const SIGNATURE_ALG_NAMES: Record<string, (hash: string) => string> = {
  'RSASSA-PKCS1-v1_5': (hash) => `${hash.toLowerCase().replace('-', '')}WithRSAEncryption`,
  'RSA-PSS': (hash) => `RSASSA-PSS-${hash}`,
  ECDSA: (hash) => `ecdsa-with-${hash.replace('-', '')}`,
};

export function parseCertificateFromX5C(x5cEntry: string): ParsedCertificate {
  const cert = new x509.X509Certificate(x5cEntry);

  const validFrom = cert.notBefore;
  const validUntil = cert.notAfter;
  const now = new Date();
  const isValid = now >= validFrom && now <= validUntil;

  let daysRemaining: number | null = null;
  let status: CertificateStatus = 'expired';
  if (isValid) {
    const msRemaining = validUntil.getTime() - now.getTime();
    daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
    status = daysRemaining > 30 ? 'valid' : 'expiring-soon';
  }

  const subjectAltNames = extractSubjectAltNames(cert);
  const spiffeId = extractSpiffeId(subjectAltNames);

  const { algorithm: publicKeyAlgorithm, size: publicKeySize } = describePublicKey(
    cert.publicKey.algorithm
  );
  const signatureAlgorithm = describeSignatureAlgorithm(cert.signatureAlgorithm);

  return {
    spiffeId,
    subject: cert.subject,
    issuer: cert.issuer,
    serialNumber: cert.serialNumber,
    validFrom,
    validUntil,
    isValid,
    daysRemaining,
    status,
    publicKeyAlgorithm,
    publicKeySize,
    signatureAlgorithm,
    keyUsage: extractKeyUsage(cert),
    extendedKeyUsage: extractExtendedKeyUsage(cert),
    basicConstraints: extractBasicConstraints(cert),
    subjectAltNames,
    subjectKeyIdentifier: extractSubjectKeyId(cert),
    authorityKeyIdentifier: extractAuthorityKeyId(cert),
    pemEncoded: cert.toString('pem'),
    derEncoded: x5cEntry,
  };
}

function extractSubjectAltNames(cert: x509.X509Certificate): SubjectAltName[] {
  const ext = cert.getExtension(x509.SubjectAlternativeNameExtension);
  if (!ext) return [];

  const out: SubjectAltName[] = [];
  for (const name of ext.names.items) {
    let type: SubjectAltName['type'] | null = null;
    switch (name.type) {
      case 'url':
        type = 'URI';
        break;
      case 'dns':
        type = 'DNS';
        break;
      case 'ip':
        type = 'IP';
        break;
      case 'email':
        type = 'EMAIL';
        break;
      default:
        continue;
    }
    out.push({ type, value: name.value });
  }
  return out;
}

function extractSpiffeId(sans: SubjectAltName[]): string {
  const uris = sans.filter((s) => s.type === 'URI');
  if (uris.length === 0) return 'No SPIFFE ID found';
  if (uris.length > 1) {
    console.warn('Multiple URI SANs found - SPIFFE spec violation');
  }
  return uris[0].value;
}

function describePublicKey(algorithm: KeyAlgorithm): {
  algorithm: string;
  size: string;
} {
  const name = algorithm.name;
  if (name.startsWith('RSA')) {
    const modulusLength = (algorithm as RsaKeyAlgorithm).modulusLength;
    return { algorithm: 'RSA', size: modulusLength ? `${modulusLength}` : 'Unknown' };
  }
  if (name === 'ECDSA' || name === 'ECDH') {
    const namedCurve = (algorithm as EcKeyAlgorithm).namedCurve;
    return { algorithm: 'EC', size: namedCurve ?? 'Unknown' };
  }
  if (name === 'Ed25519' || name === 'Ed448') {
    return { algorithm: name, size: name };
  }
  return { algorithm: name || 'Unknown', size: 'Unknown' };
}

function describeSignatureAlgorithm(algorithm: { name: string; hash?: { name: string } | string }): string {
  const hashName = typeof algorithm.hash === 'string' ? algorithm.hash : algorithm.hash?.name;
  if (!hashName) return algorithm.name;
  const formatter = SIGNATURE_ALG_NAMES[algorithm.name];
  return formatter ? formatter(hashName) : `${algorithm.name}-${hashName}`;
}

function extractKeyUsage(cert: x509.X509Certificate): KeyUsage {
  const ext = cert.getExtension(x509.KeyUsagesExtension);
  if (!ext) {
    return {
      digitalSignature: false,
      keyEncipherment: false,
      keyAgreement: false,
      keyCertSign: false,
      crlSign: false,
      critical: false,
    };
  }
  const flags = ext.usages;
  return {
    digitalSignature: (flags & KEY_USAGE_DIGITAL_SIGNATURE) !== 0,
    keyEncipherment: (flags & KEY_USAGE_KEY_ENCIPHERMENT) !== 0,
    keyAgreement: (flags & KEY_USAGE_KEY_AGREEMENT) !== 0,
    keyCertSign: (flags & KEY_USAGE_KEY_CERT_SIGN) !== 0,
    crlSign: (flags & KEY_USAGE_CRL_SIGN) !== 0,
    critical: ext.critical,
  };
}

function extractExtendedKeyUsage(cert: x509.X509Certificate): string[] {
  const ext = cert.getExtension(x509.ExtendedKeyUsageExtension);
  if (!ext) return [];
  return Array.from(ext.usages as ArrayLike<string>).map(
    (oid) => EKU_OID_NAMES[oid] ?? oid
  );
}

function extractBasicConstraints(cert: x509.X509Certificate): BasicConstraints {
  const ext = cert.getExtension(x509.BasicConstraintsExtension);
  if (!ext) {
    return { cA: false, pathLenConstraint: null, critical: false };
  }
  return {
    cA: ext.ca,
    pathLenConstraint: ext.pathLength ?? null,
    critical: ext.critical,
  };
}

function extractSubjectKeyId(cert: x509.X509Certificate): string | null {
  const ext = cert.getExtension(x509.SubjectKeyIdentifierExtension);
  if (!ext || !ext.keyId) return null;
  return formatHexBytes(ext.keyId);
}

function extractAuthorityKeyId(cert: x509.X509Certificate): string | null {
  const ext = cert.getExtension(x509.AuthorityKeyIdentifierExtension);
  if (!ext || !ext.keyId) return null;
  return formatHexBytes(ext.keyId);
}

function formatHexBytes(hex: string): string {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  const pairs: string[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    pairs.push(clean.substring(i, i + 2));
  }
  return pairs.join(':').toUpperCase();
}

export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
}

export function formatSerialNumber(serial: string): string {
  const hex = serial.toLowerCase();
  const formatted: string[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    formatted.push(hex.substring(i, Math.min(i + 2, hex.length)));
  }
  return formatted.join(':');
}
