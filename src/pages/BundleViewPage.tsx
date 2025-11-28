import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Key } from 'lucide-react';
import { Header } from '../components/Header';
import { BundleHeader } from '../components/bundle/BundleHeader';
import { JWKKeyCard } from '../components/svid/JWKKeyCard';
import { CertificateTimeline } from '../components/svid/CertificateTimeline';
import { CertificateCard } from '../components/svid/CertificateCard';
import { fetchBundle, parseBundle, CORSError, detectInputType } from '../utils/bundleParser';
import { base64urlDecode } from '../utils/base64url';
import type {
  SPIFFEBundle,
  ParsedJWK,
  ParsedX509SVID,
  ParsedCertificate,
} from '../types';
import { parseSpiffeId } from '../utils/spiffeid';

type TabType = 'jwt' | 'x509' | 'wit';

export function BundleViewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCorsError, setIsCorsError] = useState(false);
  const [bundle, setBundle] = useState<SPIFFEBundle | null>(null);

  const [jwtKeys, setJwtKeys] = useState<ParsedJWK[]>([]);
  const [x509Keys, setX509Keys] = useState<ParsedX509SVID[]>([]);
  const [witKeys, setWitKeys] = useState<ParsedJWK[]>([]);

  const [activeTab, setActiveTab] = useState<TabType>('x509');
  const [showProxyPrompt, setShowProxyPrompt] = useState(false);
  const [originalInput, setOriginalInput] = useState<string>('');

  const [trustDomain, setTrustDomain] = useState<string>('');
  useEffect(() => {
    x509Keys.flatMap((key) => {
      return key.certificates.map((cert) => {
        try {
          return parseSpiffeId(cert.spiffeId).getTrustDomain();
        } catch (error) {
          return ""
        }
      })
    }).filter((spiffeID) => {
      return spiffeID !== "";
    }).find((td) => {
      setTrustDomain(td);
      return true;
    })
  }, [x509Keys])

  useEffect(() => {
    const urlParam = searchParams.get('url');
    const contentParam = searchParams.get('content');

    if (!urlParam && !contentParam) {
      setError('No bundle URL or content provided');
      setIsLoading(false);
      return;
    }

    const loadBundle = async () => {
      setIsLoading(true);
      setError(null);
      setIsCorsError(false);

      try {
        let input: string;
        if (urlParam) {
          input = base64urlDecode(urlParam);
        } else if (contentParam) {
          input = base64urlDecode(contentParam);
        } else {
          throw new Error('No valid parameter found');
        }

        setOriginalInput(input);

        let fetchedBundle: SPIFFEBundle;
        const inputType = detectInputType(input);

        if (inputType === 'json') {
          fetchedBundle = JSON.parse(input.trim()) as SPIFFEBundle;
        } else if (inputType === 'url') {
          fetchedBundle = await fetchBundle(input, false);
        } else {
          throw new Error('Invalid input: must be either a valid HTTPS URL or bundle JSON');
        }

        const parsed = parseBundle(fetchedBundle);

        setBundle(fetchedBundle);
        setJwtKeys(parsed.jwtKeys);
        setX509Keys(parsed.x509Keys);
        setWitKeys(parsed.witKeys);

        // Switch to the first tab with keys
        if (parsed.x509Keys.length > 0) {
          setActiveTab('x509');
        } else if (parsed.jwtKeys.length > 0) {
          setActiveTab('jwt');
        } else if (parsed.witKeys.length > 0) {
          setActiveTab('wit');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        setIsCorsError(err instanceof CORSError);
        setBundle(null);
        setJwtKeys([]);
        setX509Keys([]);
        setWitKeys([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadBundle();
  }, [searchParams]);

  const handleRetryWithProxy = async () => {
    setShowProxyPrompt(false);
    setIsLoading(true);
    setError(null);
    setIsCorsError(false);

    try {
      const fetchedBundle = await fetchBundle(originalInput, true);
      const parsed = parseBundle(fetchedBundle);

      setBundle(fetchedBundle);
      setJwtKeys(parsed.jwtKeys);
      setX509Keys(parsed.x509Keys);
      setWitKeys(parsed.witKeys);

      if (parsed.jwtKeys.length > 0) {
        setActiveTab('jwt');
      } else if (parsed.x509Keys.length > 0) {
        setActiveTab('x509');
      } else if (parsed.witKeys.length > 0) {
        setActiveTab('wit');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setIsCorsError(err instanceof CORSError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCertificateClick = (cert: ParsedCertificate) => {
    const element = document.getElementById(`cert-${cert.serialNumber}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const allCertificates = x509Keys.flatMap((key) => key.certificates);

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        title={`SPIFFE Bundle Explorer${trustDomain ? `: ${trustDomain}` : ''}`}
        trailingComponents={
          <button
            className="bg-gray-100 text-black border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-gray-200 hover:border-gray-300 whitespace-nowrap flex items-center gap-2"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4" /> Explore a different bundle
          </button>
        }
      />

      <main className="max-w-7xl w-full mx-auto px-8 py-8">
        {isLoading && (
          <div className="text-center py-12">
            <div className="spinner-large"></div>
            <p className="mt-4 text-gray-600">Loading bundle...</p>
          </div>
        )}

        {error && !isLoading && (
          <>
            {!isCorsError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
                <div className="font-semibold text-red-800 mb-2 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Failed to load bundle</div>
                <div className="text-red-700">{error}</div>
              </div>
            )}

            {isCorsError && !showProxyPrompt && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
                <div className="font-semibold text-red-800 mb-2 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> CORS Error</div>
                <div className="text-red-700 mb-4">{error}</div>
                <div className="mt-4 p-4 bg-white rounded border border-red-100">
                  <strong className="block mb-2">Would you like to use a CORS proxy?</strong>
                  <p className="text-sm text-gray-600 mb-4">
                    A CORS proxy (cors.lol) can help bypass this restriction for testing purposes.
                  </p>
                  <div className="flex gap-3 mb-4">
                    <button
                      onClick={handleRetryWithProxy}
                      className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors hover:bg-primary-700 disabled:opacity-50"
                      disabled={isLoading}
                    >
                      Yes, use proxy
                    </button>
                    <button
                      onClick={() => setShowProxyPrompt(false)}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors hover:bg-gray-300"
                    >
                      No, cancel
                    </button>
                  </div>
                  <div className="text-xs text-gray-600 p-3 bg-gray-50 rounded border border-gray-200">
                    <strong>Note:</strong> Only use the proxy for development/testing purposes.
                    For production, configure your bundle endpoint to support CORS.
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {bundle && !isLoading && (
          <>
            <BundleHeader
              trustDomain={trustDomain}
              bundle={bundle}
              jwtKeys={jwtKeys}
              x509Keys={x509Keys}
              witKeys={witKeys}
            />

            <div className="mb-8">
              <div className="flex gap-1 mb-6 border-b-2 border-gray-200">
                <button
                  className={`px-6 py-3 font-semibold transition-all relative cursor-pointer ${
                    activeTab === 'x509'
                      ? 'text-primary-600 border-b-2 border-primary-600 -mb-0.5'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveTab('x509')}
                >
                  X.509-SVID
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'x509'
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {x509Keys.length}
                  </span>
                </button>
                <button
                  className={`px-6 py-3 font-semibold transition-all relative cursor-pointer ${
                    activeTab === 'jwt'
                      ? 'text-primary-600 border-b-2 border-primary-600 -mb-0.5'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveTab('jwt')}
                >
                  JWT-SVID
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'jwt'
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {jwtKeys.length}
                  </span>
                </button>
                <button
                  className={`px-6 py-3 font-semibold transition-all relative cursor-pointer ${
                    activeTab === 'wit'
                      ? 'text-primary-600 border-b-2 border-primary-600 -mb-0.5'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveTab('wit')}
                >
                  WIT-SVID
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'wit'
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {witKeys.length}
                  </span>
                </button>
              </div>

              <div>
                {activeTab === 'jwt' && (
                  <div>
                    {jwtKeys.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-lg">
                        <Key className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <div className="text-gray-600">
                          No JWT-SVID keys found in this bundle
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {jwtKeys.map((key) => (
                          <JWKKeyCard key={key.id} jwk={key} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'x509' && (
                  <div>
                    {x509Keys.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-lg">
                        <Key className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <div className="text-gray-600">
                          No X.509-SVID keys found in this bundle
                        </div>
                      </div>
                    ) : (
                      <>
                        <CertificateTimeline
                          certificates={allCertificates}
                          onCertificateClick={handleCertificateClick}
                        />
                        <div className="space-y-4 mt-4">
                          {allCertificates.map((cert, index) => (
                            <div
                              key={`${cert.serialNumber}-${index}`}
                              id={`cert-${cert.serialNumber}`}
                            >
                              <CertificateCard certificate={cert} />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'wit' && (
                  <div>
                    {witKeys.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-lg">
                        <Key className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <div className="text-gray-600">
                          No WIT-SVID keys found in this bundle
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {witKeys.map((key) => (
                          <JWKKeyCard key={key.id} jwk={key} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
