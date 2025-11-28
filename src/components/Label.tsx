interface LabelProps {
  text: string;
  color?: 'primary' | 'secondary' | 'red' | 'yellow' | 'green' | 'blue' | 'gray';
  className?: string;
}

export function Label({ text, color = 'gray', className = '' }: LabelProps) {
  const colorClasses = {
    primary: 'bg-primary-100 text-primary-800 border-primary-300',
    secondary: 'bg-purple-100 text-purple-800 border-purple-300',
    red: 'bg-red-100 text-red-800 border-red-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    green: 'bg-green-100 text-green-800 border-green-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    gray: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded border text-xs font-semibold ${colorClasses[color]} ${className}`}>
      {text}
    </span>
  );
}
