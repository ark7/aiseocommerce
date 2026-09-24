import { ALLOWED_TRANSITIONS, canTransition, nextStatuses } from '@/lib/orderStatus';
import type { OrderStatus } from '@prisma/client';

const ALL_STATUSES = Object.keys(ALLOWED_TRANSITIONS) as OrderStatus[];

describe('order status transitions', () => {
  it('allows the normal fulfilment path', () => {
    expect(canTransition('PENDING', 'PAID')).toBe(true);
    expect(canTransition('PAID', 'PROCESSING')).toBe(true);
    expect(canTransition('PROCESSING', 'SHIPPED')).toBe(true);
    expect(canTransition('SHIPPED', 'DELIVERED')).toBe(true);
    expect(canTransition('DELIVERED', 'COMPLETED')).toBe(true);
  });

  it('rejects skipping ahead', () => {
    expect(canTransition('PENDING', 'COMPLETED')).toBe(false);
    expect(canTransition('PENDING', 'SHIPPED')).toBe(false);
    expect(canTransition('PAID', 'DELIVERED')).toBe(false);
  });

  it('treats CANCELLED and REFUNDED as terminal', () => {
    expect(nextStatuses('CANCELLED')).toEqual([]);
    expect(nextStatuses('REFUNDED')).toEqual([]);
  });

  it('lets a paid or later order be refunded', () => {
    expect(canTransition('PAID', 'REFUNDED')).toBe(true);
    expect(canTransition('PROCESSING', 'REFUNDED')).toBe(true);
    expect(canTransition('DELIVERED', 'REFUNDED')).toBe(true);
  });

  it('never lists a status as reachable from itself', () => {
    for (const status of ALL_STATUSES) {
      expect(ALLOWED_TRANSITIONS[status]).not.toContain(status);
    }
  });

  it('only references statuses that exist in the map', () => {
    for (const status of ALL_STATUSES) {
      for (const target of ALLOWED_TRANSITIONS[status]) {
        expect(ALL_STATUSES).toContain(target);
      }
    }
  });
});
