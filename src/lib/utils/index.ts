import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return (
    new Intl.NumberFormat('fr-SN', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount)) + ' FCFA'
  );
}

export function formatDate(date: string | Date | null | undefined, pattern = 'dd/MM/yyyy'): string {
  if (!date) return '—';
  try {
    return format(new Date(date), pattern, { locale: fr });
  } catch {
    return '—';
  }
}

export function formatDateRelative(date: string | Date | null | undefined): string {
  if (!date) return '—';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
  } catch {
    return '—';
  }
}

export function formatMonth(month: number, year: number): string {
  try {
    return format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: fr });
  } catch {
    return month + '/' + year;
  }
}

export function getInitials(name: string): string {
  if (!name || name.trim() === '') return '?';
  return name
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, n: number): string {
  if (!str) return '';
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

export function generateReference(prefix: string): string {
  const d = format(new Date(), 'yyyyMMdd');
  const r = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return prefix + '-' + d + '-' + r;
}

export function getPropertyTypeLabel(type: string): string {
  const m: Record<string, string> = {
    apartment: 'Appartement',
    house: 'Maison',
    commercial: 'Local commercial',
    office: 'Bureau',
    warehouse: 'Entrepôt',
    land: 'Terrain',
  };
  return m[type] || type;
}

export function getPriorityLabel(priority: string): string {
  const m: Record<string, string> = {
    low: 'Faible',
    medium: 'Moyen',
    high: 'Élevé',
    urgent: 'Urgent',
  };
  return m[priority] || priority;
}

export function getPriorityColor(priority: string): string {
  const m: Record<string, string> = {
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };
  return m[priority] || 'bg-gray-100 text-gray-700';
}

export function getPaymentStatusColor(status: string): string {
  const m: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    late: 'bg-red-100 text-red-700',
    partial: 'bg-blue-100 text-blue-700',
  };
  return m[status] || 'bg-gray-100 text-gray-700';
}

export function isLeaseExpiringSoon(endDate: string, days = 30): boolean {
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
  return diff > 0 && diff <= days;
}

export function isLeaseExpired(endDate: string): boolean {
  return new Date(endDate) < new Date();
}

export function calculateOccupancyRate(total: number, rented: number): number {
  if (total === 0) return 0;
  return Math.round((rented / total) * 100);
}

export function downloadHTML(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
