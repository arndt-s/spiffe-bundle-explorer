import { Download } from 'lucide-react';
import { Button } from './Button';

interface DownloadButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
}

export function DownloadButton({ label, onClick, className = '' }: DownloadButtonProps) {
  return (
    <Button
      label={label}
      onClick={onClick}
      leadingIcon={<Download className="w-4 h-4" />}
      className={className}
    />
  );
}
