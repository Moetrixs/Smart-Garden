import React from 'react';

export interface SectionCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  description,
  icon,
  badge,
  children,
  variant = 'default',
}) => {
  const variantStyles = {
    default: 'rounded-xl border border-slate-800 bg-slate-900/60 p-5',
    elevated: 'rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg',
    outlined: 'rounded-xl border border-slate-800 bg-slate-950/40 p-5',
  };

  return (
    <div className={variantStyles[variant]}>
      {(title || icon || badge) && (
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {icon && <span className="text-cyan-400">{icon}</span>}
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
              {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
            </div>
          </div>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
