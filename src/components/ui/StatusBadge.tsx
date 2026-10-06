import React from 'lucide-react';

export interface StatusBadgeProps {
  variant: 'success' | 'warning' | 'error' | 'info';
  label: string;
  icon?: React.ReactNode;
  animated?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ variant, label, icon, animated }) => {
  const variantStyles = {
    success: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    warning: 'bg-amber-950 text-amber-300 border-amber-800',
    error: 'bg-rose-950 text-rose-300 border-rose-800',
    info: 'bg-cyan-950 text-cyan-300 border-cyan-800',
  };

  const animatedClass = animated ? 'animate-pulse' : '';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border ${variantStyles[variant]} ${animatedClass}`}
    >
      {icon && <span className="w-3.5 h-3.5 flex items-center justify-center">{icon}</span>}
      <span>{label}</span>
    </span>
  );
};
