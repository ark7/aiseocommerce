import type { OrderStatus } from '@prisma/client';

/**
 * Allowed order status transitions, kept free of any database import so both the
 * server service and the admin UI share one source of truth.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'MANUAL_VERIFICATION', 'CANCELLED'],
  MANUAL_VERIFICATION: ['PAID', 'PROCESSING', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'CANCELLED', 'REFUNDED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['COMPLETED', 'REFUNDED'],
  COMPLETED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function nextStatuses(from: OrderStatus): OrderStatus[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}

/** Indonesian labels for the admin UI. */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Menunggu Pembayaran',
  PAID: 'Dibayar',
  MANUAL_VERIFICATION: 'Menunggu Konfirmasi',
  PROCESSING: 'Diproses',
  SHIPPED: 'Dikirim',
  DELIVERED: 'Diterima',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
  REFUNDED: 'Dana Dikembalikan',
};
