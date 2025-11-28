import * as forge from 'node-forge';
import type {
  ParsedCertificate,
  KeyUsage,
  BasicConstraints,
  SubjectAltName,
  PublicKeyParams,
  CertificateStatus,
} from '../types';

export function parseCertificateFromX5C(x5cEntry: string): ParsedCertificate {
  // Decode base64 to binary DER
  const derBinary = forge.util.decode64(x5cEntry);

  // Parse DER to certificate object
  const cert = forge.pki.certificateFromAsn1(forge.asn1.fromDer(derBinary));

  // Extract SPIFFE ID from SAN
  const spiffeId = extractSpiffeId(cert);

  // Extract subject and issuer
  const subject = formatDistinguishedName(cert.subject.attributes);
  const issuer = formatDistinguishedName(cert.issuer.attributes);

  // Extract serial number
  const serialNumber = cert.serialNumber;

  // Validity dates
  const validFrom = cert.validity.notBefore;
  const validUntil = cert.validity.notAfter;
  const now = new Date();
  const isValid = now >= validFrom && now <= validUntil;

  // Calculate days remaining
  let daysRemaining: number | null = null;
  let status: CertificateStatus = 'expired';

  if (isValid) {
    const msRemaining = validUntil.getTime() - now.getTime();
    daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));

    if (daysRemaining > 30) {
      status = 'valid';
    } else {
      status = 'expiring-soon';
    }
  }

  // Extract key information
  const publicKey = cert.publicKey as forge.pki.rsa.PublicKey;
  const publicKeyAlgorithm = getPublicKeyAlgorithm(publicKey);
  const publicKeySize = getPublicKeySize(publicKey);
  const signatureAlgorithm = cert.signatureOid
    ? getSignatureAlgorithmName(cert.signatureOid)
    : 'Unknown';

  // Extract extensions
  const keyUsage = extractKeyUsage(cert);
  const extendedKeyUsage = extractExtendedKeyUsage(cert);
  const basicConstraints = extractBasicConstraints(cert);
  const subjectAltNames = extractSubjectAltNames(cert);
  const subjectKeyIdentifier = extractSubjectKeyIdentifier(cert);
  const authorityKeyIdentifier = extractAuthorityKeyIdentifier(cert);

  // Extract public key parameters
  const publicKeyParams = extractPublicKeyParams(publicKey);

  // Convert to PEM
  const pemEncoded = forge.pki.certificateToPem(cert);

  return {
    spiffeId,
    subject,
    issuer,
    serialNumber,
    validFrom,
    validUntil,
    isValid,
    daysRemaining,
    status,
    publicKeyAlgorithm,
    publicKeySize,
    signatureAlgorithm,
    keyUsage,
    extendedKeyUsage,
    basicConstraints,
    subjectAltNames,
    subjectKeyIdentifier,
    authorityKeyIdentifier,
    publicKeyParams,
    pemEncoded,
    derEncoded: x5cEntry,
    raw: cert,
  };
}

function extractSpiffeId(cert: forge.pki.Certificate): string {
  const sans = extractSubjectAltNames(cert);
  const uriSans = sans.filter((san) => san.type === 'URI');

  if (uriSans.length === 0) {
    return 'No SPIFFE ID found';
  }

  if (uriSans.length > 1) {
    console.warn('Multiple URI SANs found - SPIFFE spec violation');
  }

  return uriSans[0].value;
}

function formatDistinguishedName(dn: forge.pki.CertificateField[]): string {
  return dn
    .map((attr) => `${attr.shortName || attr.name}=${attr.value}`)
    .join(', ');
}

function getPublicKeyAlgorithm(publicKey: any): string {
  if (publicKey.n && publicKey.e) {
    return 'RSA';
  } else if (publicKey.curve) {
    return 'EC';
  }
  return 'Unknown';
}

function getPublicKeySize(publicKey: any): string {
  if (publicKey.n) {
    // RSA key - calculate bit length from modulus
    const bits = publicKey.n.bitLength();
    return `${bits}`;
  } else if (publicKey.curve) {
    // EC key - get curve name
    return publicKey.curve || 'Unknown curve';
  }
  return 'Unknown';
}

function getSignatureAlgorithmName(oid: string): string {
  const oidMap: Record<string, string> = {
    '1.2.840.113549.1.1.5': 'sha1WithRSAEncryption',
    '1.2.840.113549.1.1.11': 'sha256WithRSAEncryption',
    '1.2.840.113549.1.1.12': 'sha384WithRSAEncryption',
    '1.2.840.113549.1.1.13': 'sha512WithRSAEncryption',
    '1.2.840.10045.4.3.2': 'ecdsa-with-SHA256',
    '1.2.840.10045.4.3.3': 'ecdsa-with-SHA384',
    '1.2.840.10045.4.3.4': 'ecdsa-with-SHA512',
  };

  return oidMap[oid] || oid;
}

function extractKeyUsage(cert: forge.pki.Certificate): KeyUsage {
  const ext = cert.getExtension('keyUsage');

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

  return {
    digitalSignature: (ext as any).digitalSignature || false,
    keyEncipherment: (ext as any).keyEncipherment || false,
    keyAgreement: (ext as any).keyAgreement || false,
    keyCertSign: (ext as any).keyCertSign || false,
    crlSign: (ext as any).cRLSign || false,
    critical: (ext as any).critical || false,
  };
}

function extractExtendedKeyUsage(cert: forge.pki.Certificate): string[] {
  const ext = cert.getExtension('extKeyUsage');

  if (!ext || !(ext as any).serverAuth) {
    return [];
  }

  const usages: string[] = [];

  if ((ext as any).serverAuth) {
    usages.push('TLS Server Authentication');
  }
  if ((ext as any).clientAuth) {
    usages.push('TLS Client Authentication');
  }
  if ((ext as any).codeSigning) {
    usages.push('Code Signing');
  }
  if ((ext as any).emailProtection) {
    usages.push('Email Protection');
  }
  if ((ext as any).timeStamping) {
    usages.push('Time Stamping');
  }

  return usages;
}

function extractBasicConstraints(cert: forge.pki.Certificate): BasicConstraints {
  const ext = cert.getExtension('basicConstraints');

  if (!ext) {
    return {
      cA: false,
      pathLenConstraint: null,
      critical: false,
    };
  }

  return {
    cA: (ext as any).cA || false,
    pathLenConstraint: (ext as any).pathLenConstraint ?? null,
    critical: (ext as any).critical || false,
  };
}

function extractSubjectAltNames(cert: forge.pki.Certificate): SubjectAltName[] {
  const ext = cert.getExtension('subjectAltName');

  if (!ext || !(ext as any).altNames) {
    return [];
  }

  const altNames = (ext as any).altNames as any[];

  return altNames.map((altName) => {
    let type: SubjectAltName['type'] = 'URI';
    let value = '';

    if (altName.type === 6) {
      // URI
      type = 'URI';
      value = altName.value;
    } else if (altName.type === 2) {
      // DNS
      type = 'DNS';
      value = altName.value;
    } else if (altName.type === 7) {
      // IP
      type = 'IP';
      value = altName.ip || altName.value;
    } else if (altName.type === 1) {
      // EMAIL
      type = 'EMAIL';
      value = altName.value;
    }

    return { type, value };
  });
}

function extractSubjectKeyIdentifier(cert: forge.pki.Certificate): string | null {
  const ext = cert.getExtension('subjectKeyIdentifier');

  if (!ext || !(ext as any).subjectKeyIdentifier) {
    return null;
  }

  // The extension value is a hex string, convert to byte array format with colons
  const keyId = (ext as any).subjectKeyIdentifier as string;
  const hexBytes: string[] = [];

  for (let i = 0; i < keyId.length; i += 2) {
    hexBytes.push(keyId.substring(i, i + 2));
  }

  return hexBytes.join(':').toUpperCase();
}

function extractAuthorityKeyIdentifier(cert: forge.pki.Certificate): string | null {
  const ext = cert.getExtension('authorityKeyIdentifier');

  if (!ext || !(ext as any).keyIdentifier) {
    return null;
  }

  // The extension value is a hex string, convert to byte array format with colons
  const keyId = (ext as any).keyIdentifier as string;
  const hexBytes: string[] = [];

  for (let i = 0; i < keyId.length; i += 2) {
    hexBytes.push(keyId.substring(i, i + 2));
  }

  return hexBytes.join(':').toUpperCase();
}

function extractPublicKeyParams(publicKey: any): PublicKeyParams {
  if (publicKey.n && publicKey.e) {
    // RSA key
    const modulusBytes = publicKey.n.toByteArray();
    const modulusBinaryString = String.fromCharCode.apply(null, modulusBytes as any);
    return {
      algorithm: 'RSA',
      modulus: forge.util.encode64(modulusBinaryString),
      exponent: publicKey.e.toString(),
    };
  } else if (publicKey.curve) {
    // EC key
    let xEncoded: string | undefined;
    let yEncoded: string | undefined;

    if (publicKey.x) {
      const xBinaryString = typeof publicKey.x === 'string'
        ? publicKey.x
        : String.fromCharCode.apply(null, publicKey.x as any);
      xEncoded = forge.util.encode64(xBinaryString);
    }

    if (publicKey.y) {
      const yBinaryString = typeof publicKey.y === 'string'
        ? publicKey.y
        : String.fromCharCode.apply(null, publicKey.y as any);
      yEncoded = forge.util.encode64(yBinaryString);
    }

    return {
      algorithm: 'EC',
      curve: publicKey.curve,
      x: xEncoded,
      y: yEncoded,
    };
  }

  return {
    algorithm: 'Unknown',
  };
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
  // Format serial number with colons
  const hex = serial.toLowerCase();
  const formatted: string[] = [];

  for (let i = 0; i < hex.length; i += 2) {
    formatted.push(hex.substring(i, Math.min(i + 2, hex.length)));
  }

  return formatted.join(':');
}
