import type { ReactNode } from 'react';

interface HeaderProps {
  title: string;
  trailingComponents?: ReactNode;
}

export function Header({ title, trailingComponents }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-slate-50 to-gray-100 border-b-2 border-gray-200 py-4 px-8 shadow-sm">
      <div className="flex justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <img
            src={`${import.meta.env.BASE_URL}spiffe-icon-color.svg`}
            alt="SPIFFE Logo"
            className="h-12 w-auto"
          />
          <div className="h-10 w-px bg-gray-300"></div>
          <h1 className="m-0 text-2xl font-semibold text-gray-800">{title}</h1>
        </div>
        {trailingComponents}
      </div>
    </header>
  );
}
