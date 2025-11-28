import type { ParsedJWK } from '../../types';
import { CopyButton } from '../CopyButton';
import { Label } from '../Label';
import { base64urlDecode } from '../../utils/base64url';

interface JWKKeyCardProps {
  jwk: ParsedJWK;
}

export function JWKKeyCard({ jwk }: JWKKeyCardProps) {
  const getAlgDetail = (): string | null => {
    if (jwk.kty === 'RSA' && jwk.n) {
      // RSA: Calculate key size from modulus
      try {
        const modulusBytes = base64urlDecode(jwk.n);
        return `RSA ${modulusBytes.length * 8}`;
      } catch {
        return 'RSA';
      }
    } else if (jwk.kty === 'EC' && jwk.crv) {
      // EC: Use curve name
      const curveMap: Record<string, string> = {
        'P-256': 'ECDSA P-256',
        'P-384': 'ECDSA P-384',
        'P-521': 'ECDSA P-521',
      };
      return curveMap[jwk.crv] || `ECDSA ${jwk.crv}`;
    }
    return null;
  };

  const algDetail = getAlgDetail();

  const getJWKJSON = () => {
    const { id, ...jwkData } = jwk;
    return JSON.stringify(jwkData, null, 2);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="mb-2">
            {jwk.kid ? (
              <span className="font-mono text-lg font-semibold text-gray-900">{jwk.kid}</span>
            ) : (
              <span className="text-gray-400 italic">No Key ID</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {algDetail && <Label text={algDetail} color="gray" />}
          </div>
        </div>
        <div className="ml-4">
          <CopyButton label="Copy JWK" content={getJWKJSON()} />
        </div>
      </div>
    </div>
  );
}
