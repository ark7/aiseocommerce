import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export type AuditEntityType = 
  | 'ORDER' | 'PAYMENT' | 'PRODUCT' | 'USER' | 'STORE' 
  | 'CATEGORY' | 'LEDGER' | 'STOCK' | 'PETTY_CASH' | 'SETTING';

export interface AuditAction {
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  userId?: string;
  storeId?: string;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit trail entry to the database
 */
export async function logAuditAction(
  action: string,
  entityType: AuditEntityType,
  entityId: string,
  userId?: string,
  storeId?: string,
  oldValue?: Record<string, any> | null,
  newValue?: Record<string, any> | null,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        userId,
        storeId,
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        ipAddress,
        userAgent,
      },
    });

    logger.info(`Audit logged: ${action} ${entityType} ${entityId}`, {
      userId,
      storeId,
      action,
      entityType,
      entityId,
    });
  } catch (error) {
    logger.error('Failed to log audit action', {
      action,
      entityType,
      entityId,
      userId,
      storeId,
    }, error instanceof Error ? error : String(error));
  }
}

/**
 * Get audit logs for a specific entity
 */
export async function getAuditLogs(
  entityType: AuditEntityType,
  entityId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    return await prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  } catch (error) {
    logger.error('Failed to fetch audit logs', { entityType, entityId }, 
      error instanceof Error ? error : String(error));
    return [];
  }
}

/**
 * Convenience methods for common audit scenarios
 */

// Order actions
export async function auditOrderCreated(
  orderId: string,
  userId: string,
  storeId: string,
  data: Record<string, any>,
  ipAddress?: string
): Promise<void> {
  await logAuditAction(
    'CREATE',
    'ORDER',
    orderId,
    userId,
    storeId,
    null,
    data,
    ipAddress
  );
}

export async function auditOrderUpdated(
  orderId: string,
  userId: string,
  storeId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  ipAddress?: string
): Promise<void> {
  await logAuditAction(
    'UPDATE',
    'ORDER',
    orderId,
    userId,
    storeId,
    oldData,
    newData,
    ipAddress
  );
}

export async function auditOrderStatusChanged(
  orderId: string,
  userId: string,
  storeId: string,
  oldStatus: string,
  newStatus: string,
  ipAddress?: string
): Promise<void> {
  await logAuditAction(
    'STATUS_CHANGE',
    'ORDER',
    orderId,
    userId,
    storeId,
    { status: oldStatus },
    { status: newStatus },
    ipAddress
  );
}

// Payment actions
export async function auditPaymentVerified(
  paymentId: string,
  userId: string,
  storeId: string,
  action: 'APPROVE' | 'REJECT',
  oldStatus: string,
  newStatus: string,
  ipAddress?: string
): Promise<void> {
  await logAuditAction(
    action === 'APPROVE' ? 'APPROVE' : 'REJECT',
    'PAYMENT',
    paymentId,
    userId,
    storeId,
    { status: oldStatus },
    { status: newStatus, action },
    ipAddress
  );
}

// Product actions
export async function auditProductCreated(
  productId: string,
  userId: string,
  storeId: string,
  data: Record<string, any>,
  ipAddress?: string
): Promise<void> {
  await logAuditAction(
    'CREATE',
    'PRODUCT',
    productId,
    userId,
    storeId,
    null,
    data,
    ipAddress
  );
}

export async function auditProductUpdated(
  productId: string,
  userId: string,
  storeId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  ipAddress?: string
): Promise<void> {
  await logAuditAction(
    'UPDATE',
    'PRODUCT',
    productId,
    userId,
    storeId,
    oldData,
    newData,
    ipAddress
  );
}

// Stock actions
export async function auditStockAdjusted(
  productId: string,
  userId: string,
  storeId: string,
  quantity: number,
  oldStock: number,
  newStock: number,
  reason: string,
  ipAddress?: string
): Promise<void> {
  await logAuditAction(
    'STOCK_ADJUSTMENT',
    'PRODUCT',
    productId,
    userId,
    storeId,
    { stock: oldStock },
    { stock: newStock, adjustment: quantity, reason },
    ipAddress
  );
}

// User actions
export async function auditUserCreated(
  userId: string,
  storeId: string,
  data: Record<string, any>,
  ipAddress?: string
): Promise<void> {
  await logAuditAction(
    'CREATE',
    'USER',
    userId,
    undefined,
    storeId,
    null,
    data,
    ipAddress
  );
}

export async function auditUserLogin(
  userId: string,
  storeId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditAction(
    'LOGIN',
    'USER',
    userId,
    userId,
    storeId,
    null,
    null,
    ipAddress,
    userAgent
  );
}

export async function auditUserLogout(
  userId: string,
  storeId: string,
  ipAddress?: string
): Promise<void> {
  await logAuditAction(
    'LOGOUT',
    'USER',
    userId,
    userId,
    storeId,
    null,
    null,
    ipAddress
  );
}

// Ledger actions
export async function auditLedgerCreated(
  ledgerId: string,
  userId: string,
  storeId: string,
  type: string,
  amount: number,
  description: string,
  ipAddress?: string
): Promise<void> {
  await logAuditAction(
    'CREATE',
    'LEDGER',
    ledgerId,
    userId,
    storeId,
    null,
    { type, amount, description },
    ipAddress
  );
}

export default {
  logAuditAction,
  getAuditLogs,
  // Order
  auditOrderCreated,
  auditOrderUpdated,
  auditOrderStatusChanged,
  // Payment
  auditPaymentVerified,
  // Product
  auditProductCreated,
  auditProductUpdated,
  // Stock
  auditStockAdjusted,
  // User
  auditUserCreated,
  auditUserLogin,
  auditUserLogout,
  // Ledger
  auditLedgerCreated,
};
