import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from './Button';

interface CopyButtonProps {
  label: string;
  content: string;
  className?: string;
}

export function CopyButton({ label, content, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Button
      label={label}
      onClick={handleCopy}
      leadingIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      variant={copied ? 'success' : 'default'}
      className={className}
    />
  );
}
