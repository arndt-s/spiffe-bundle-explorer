// SPIFFE Bundle and JWK Types

export interface JWK {
  kty: string; // Key Type (RSA, EC, oct)
  use?: string; // Key Use (jwt-svid, x509-svid, wit-svid)
  kid?: string; // Key ID
  alg?: string; // Algorithm (RS256, ES256, etc.)

  // RSA Key Parameters
  n?: string; // Modulus (base64url)
  e?: string; // Exponent (base64url)

  // EC Key Parameters
  crv?: string; // Curve (P-256, P-384, P-521)
  x?: string; // X coordinate (base64url)
  y?: string; // Y coordinate (base64url)

  // X.509 Certificate Chain
  x5c?: string[]; // X.509 Certificate Chain (base64 DER)

  // Optional fields
  key_ops?: string[]; // Key Operations
  x5t?: string; // X.509 Certificate SHA-1 Thumbprint
  'x5t#S256'?: string; // X.509 Certificate SHA-256 Thumbprint
}

export interface SPIFFEBundle {
  spiffe_sequence?: number;
  spiffe_refresh_hint?: number;
  keys: JWK[];
}

// Parsed Key Types

export interface ParsedJWK extends JWK {
  id: string; // Unique identifier for UI
}

export interface ParsedX509SVID {
  id: string; // Unique identifier for UI
  jwk: JWK; // Original JWK
  certificates: ParsedCertificate[];
}

export interface ParsedCertificate {
  // Identification
  spiffeId: string;
  subject: string;
  issuer: string;
  serialNumber: string;

  // Validity
  validFrom: Date;
  validUntil: Date;
  isValid: boolean;
  daysRemaining: number | null; // null if expired
  status: 'valid' | 'expiring-soon' | 'expired';

  // Key Information
  publicKeyAlgorithm: string;
  publicKeySize: string;
  signatureAlgorithm: string;

  // Extensions
  keyUsage: KeyUsage;
  extendedKeyUsage: string[];
  basicConstraints: BasicConstraints;
  subjectAltNames: SubjectAltName[];
  subjectKeyIdentifier: string | null;
  authorityKeyIdentifier: string | null;

  // Public Key Parameters
  publicKeyParams: PublicKeyParams;

  // Raw data
  pemEncoded: string;
  derEncoded: string; // base64
  raw: any; // node-forge certificate object
}

export interface KeyUsage {
  digitalSignature: boolean;
  keyEncipherment: boolean;
  keyAgreement: boolean;
  keyCertSign: boolean;
  crlSign: boolean;
  critical: boolean;
}

export interface BasicConstraints {
  cA: boolean;
  pathLenConstraint: number | null;
  critical: boolean;
}

export interface SubjectAltName {
  type: 'URI' | 'DNS' | 'IP' | 'EMAIL';
  value: string;
}

export interface PublicKeyParams {
  algorithm: string;
  // RSA
  modulus?: string;
  exponent?: string;
  // EC
  curve?: string;
  x?: string;
  y?: string;
}

// Application State

export interface AppState {
  // Input
  bundleUrl: string;

  // Fetch status
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;

  // Bundle data
  bundle: SPIFFEBundle | null;

  // Parsed keys by type
  jwtKeys: ParsedJWK[];
  x509Keys: ParsedX509SVID[];
  witKeys: ParsedJWK[];

  // UI state
  activeTab: 'jwt' | 'x509' | 'wit';
  expandedKeys: Set<string>;
  expandedCerts: Set<string>;
}

// Certificate Status Types

export type CertificateStatus = 'valid' | 'expiring-soon' | 'expired';

export interface TimelineEntry {
  id: string;
  spiffeId: string;
  validFrom: Date;
  validUntil: Date;
  status: CertificateStatus;
  daysRemaining: number | null;
}
