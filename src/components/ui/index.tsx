'use client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── COLOR MAP ────────────────────────────────────────────────────────────────
const COLOR_MAP = {
  blue: {
    bg: 'bg-primary/10',
    text: 'text-primary',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-600 dark:text-green-400',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-600 dark:text-amber-400',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-600 dark:text-red-400',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-600 dark:text-purple-400',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-600 dark:text-orange-400',
  },
  cyan: {
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
    text: 'text-cyan-600 dark:text-cyan-400',
  },
  slate: {
    bg: 'bg-slate-100 dark:bg-slate-700',
    text: 'text-slate-600 dark:text-slate-300',
  },
} as const;

export type ColorKey = keyof typeof COLOR_MAP;

// ─── StatCard ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: ColorKey;
  trend?: { value: number; label: string };
  loading?: boolean;
  subtitle?: string;
}

export function StatCard({
  title,
  value,
  icon,
  color = 'blue',
  trend,
  loading,
  subtitle,
}: StatCardProps) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-5 shadow-card hover:shadow-md transition-shadow"
      style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.07), inset 0 1px 0 var(--card-accent)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center',
            c.bg
          )}
        >
          <span className={c.text}>{icon}</span>
        </div>
        {trend && (
          <span
            className={cn(
              'text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1',
              trend.value >= 0
                ? 'text-green-600 bg-green-50 dark:bg-green-900/30'
                : 'text-red-600 bg-red-50 dark:bg-red-900/30'
            )}
          >
            {trend.value >= 0 ? (
              <TrendingUp size={11} />
            ) : (
              <TrendingDown size={11} />
            )}
            {trend.value >= 0 ? '+' : ''}
            {trend.value}%
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-8 w-24 bg-slate-100 dark:bg-slate-700 rounded animate-pulse mb-1" />
      ) : (
        <p className="text-2xl font-bold text-foreground">{value}</p>
      )}
      <p className="text-sm text-muted-foreground mt-1">{title}</p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-0.5 opacity-70">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
const BADGE_MAP = {
  default:
    'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  success:
    'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  warning:
    'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  error: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  purple:
    'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
} as const;

export type BadgeVariant = keyof typeof BADGE_MAP;

export function Badge({
  variant = 'default',
  children,
  className,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
        BADGE_MAP[variant] ?? BADGE_MAP.default,
        className
      )}
    >
      {children}
    </span>
  );
}

// ─── LoadingSpinner ───────────────────────────────────────────────────────────
export function LoadingSpinner({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Loader2
      size={size}
      className={cn('animate-spin text-primary', className)}
    />
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-muted-foreground mb-4">
          {icon}
        </div>
      )}
      <p className="font-semibold text-foreground mb-1">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mt-1">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  const start = Math.max(1, Math.min(totalPages - 4, page - 2));
  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, i) => start + i
  );
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <p className="text-xs text-muted-foreground">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} sur{' '}
        {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={15} />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={cn(
              'w-7 h-7 rounded-lg text-xs font-medium transition-colors',
              p === page
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700'
            )}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────
export function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmer',
  variant = 'danger',
}: {
  open: boolean;
  title: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  variant?: 'danger' | 'default';
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl max-w-sm w-full border border-border"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{title}</p>
                {description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={onConfirm}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors',
                  variant === 'danger'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-primary hover:opacity-90'
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Shared class helpers ─────────────────────────────────────────────────────
export const inputCls =
  'w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all';
export const selectCls =
  'w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none';
export const labelCls = 'block text-sm font-medium text-foreground mb-1.5';
export const btnPrimary =
  'flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed';
export const btnSecondary =
  'flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-foreground rounded-xl text-sm font-medium transition-colors';
export const cardCls =
  'bg-white dark:bg-slate-800 rounded-2xl border border-border';
