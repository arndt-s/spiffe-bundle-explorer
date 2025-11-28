import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, CheckCircle } from 'lucide-react';
import { Header } from '../components/Header';
import { validateInput } from '../utils/bundleParser';
import { base64urlEncode } from '../utils/base64url';

export function LandingPage() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newInput = e.target.value;
    setInput(newInput);

    if (newInput.trim() === '') {
      setValidationError(null);
      return;
    }

    const validation = validateInput(newInput);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid input');
    } else {
      setValidationError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateInput(input);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid input');
      return;
    }

    // Encode the input and navigate to bundle view
    const encoded = base64urlEncode(input.trim());
    const paramName = validation.type === 'url' ? 'url' : 'content';
    navigate(`/bundle?${paramName}=${encoded}`);
  };

  const isValid = input.trim() !== '' && !validationError;

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="SPIFFE Bundle Explorer" />

      <main className="max-w-7xl w-full mx-auto px-8 py-8">
        <div className="text-center mb-8">
          <Key className="w-24 h-24 mx-auto mb-4 text-primary-600" />
          <h2 className="text-2xl font-semibold mb-2">Welcome to SPIFFE Bundle Explorer</h2>
          <p className="text-gray-600">Enter a bundle endpoint URL or paste bundle JSON content to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 shadow-sm mb-8">
          <div className="relative">
            <textarea
              value={input}
              onChange={handleInputChange}
              placeholder="Enter SPIFFE bundle endpoint URL or paste bundle JSON content."
              className={`w-full px-3 py-2 border-2 rounded-lg transition-colors resize-vertical min-h-[80px] leading-normal font-inherit ${
                validationError
                  ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-200'
                  : isValid
                  ? 'border-green-500 focus:border-green-600 focus:ring-2 focus:ring-green-200'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
              } focus:outline-none`}
              rows={3}
            />
            {isValid && <CheckCircle className="absolute right-3 top-3 text-green-600 w-5 h-5" />}
          </div>

          {validationError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {validationError}
            </div>
          )}

          <button
            type="submit"
            className="w-full mt-4 bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold transition-colors hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!isValid}
          >
            Explore Bundle
          </button>
        </form>
      </main>
    </div>
  );
}
