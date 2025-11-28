import type { ReactNode } from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  variant?: 'default' | 'success';
  className?: string;
}

export function Button({ label, onClick, leadingIcon, trailingIcon, variant = 'default', className = '' }: ButtonProps) {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    success: 'bg-green-100 text-green-700 hover:bg-green-200',
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${variantClasses[variant]} ${className}`}
      type="button"
    >
      {leadingIcon}
      {label}
      {trailingIcon}
    </button>
  );
}
