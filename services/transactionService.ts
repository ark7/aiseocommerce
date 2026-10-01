import { prisma } from '@/lib/prisma';
import { LedgerType, StockType, Prisma } from '@prisma/client';
import { resolveUnitPrice } from '@/lib/pricing';
import {
  VOUCHER_REJECTION_LABELS,
  checkVoucherUsable,
  resolveVoucherDiscount,
} from '@/lib/voucher';
import type { VoucherRejection } from '@/lib/voucher';

type Db = typeof prisma | Prisma.TransactionClient;

/**
 * The cart's prices no longer match the shelf. Thrown before any money is
 * recorded so the customer can look at the new total and confirm again —
 * silently charging more than the page showed is the one thing checkout
 * must never do.
 */
export class PriceChangedError extends Error {
  constructor(
    public readonly changes: { productId: string; name: string; shown: number; actual: number }[]
  ) {
    super('Harga produk berubah sejak terakhir dilihat');
    this.name = 'PriceChangedError';
  }
}

/** The voucher cannot be used on this order, with a reason the buyer may read. */
export class VoucherError extends Error {
  constructor(public readonly reason: VoucherRejection) {
    super(VOUCHER_REJECTION_LABELS[reason]);
    this.name = 'VoucherError';
  }
}

/**
 * Write the INCOME ledger row that puts a paid order's money into the books,
 * once per order. Every path that marks an order paid (admin status change,
 * manual payment approval, gateway webhook) funnels through here, so finance
 * shows the sale and a retry or a second path cannot count it twice.
 *
 * ponytail: the existence check is not atomic — two callers racing on the same
 * order can both miss it. Add a unique index on (referenceType, referenceId)
 * when double-counted sales actually show up.
 */
export async function recordOrderIncome(
  db: Db,
  order: { id: string; storeId: string; orderNumber: string; totalAmount: number }
) {
  const existing = await db.ledger.findFirst({
    where: { referenceId: order.id, referenceType: 'ORDER', type: LedgerType.INCOME },
    select: { id: true },
  });
  if (existing) return existing;

  return db.ledger.create({
    data: {
      storeId: order.storeId,
      type: LedgerType.INCOME,
      amount: order.totalAmount,
      description: `Order ${order.orderNumber}`,
      referenceId: order.id,
      referenceType: 'ORDER',
      category: 'SALES',
    },
  });
}

export interface ProcessOrderResult {
  success: boolean;
  orderId: string;
  stockLogs?: any[];
  ledgerEntry?: any;
  error?: string;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  pettyCashBalance: number;
  profitLoss: number;
  totalCapital: number;
  totalLoans: number;
}

/**
 * Price the lines, reserve stock and sale quota, apply the voucher, and write
 * the totals — all in one transaction.
 *
 * `expectedUnitPrices` is what the cart showed the customer. When the result
 * differs, the whole order is rolled back and `PriceChangedError` names every
 * difference at once, so the buyer confirms the new total instead of finding
 * it on the receipt.
 */
export async function createOrder(
  storeId: string,
  items: { productId: string; quantity: number }[],
  customerId?: string,
  attribution?: Record<string, unknown>,
  voucherCode?: string,
  expectedUnitPrices?: Record<string, number>
) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();

    // Scoped by storeId: an id from another tenant must not be orderable, and
    // the previous unscoped lookup let one store sell another store's catalogue.
    const products = await tx.product.findMany({
      where: { id: { in: items.map((item) => item.productId) }, storeId },
    });
    const byId = new Map(products.map((product) => [product.id, product]));

    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const order = await tx.order.create({
      data: {
        storeId,
        userId: customerId,
        orderNumber,
        totalAmount: 0, // filled in at the end, once every line is priced
        subtotal: 0,
        taxAmount: 0,
        shippingCost: 0,
        discount: 0,
        status: 'PENDING', // initial status before payment
        // Campaign source for paid traffic; omitted when the order arrived
        // with no attribution at all (direct or organic).
        ...(attribution && Object.keys(attribution).length > 0
          ? { attribution: attribution as object }
          : {}),
      },
    });

    let subtotal = 0;
    const priceChanges: { productId: string; name: string; shown: number; actual: number }[] = [];

    for (const item of items) {
      const product = byId.get(item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }
      // Ensure we have enough stock (should have been reserved, but double-check)
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product ${product.name}`);
      }

      let unitPrice = resolveUnitPrice(product, now);
      let saleQuotaUsed = false;

      if (unitPrice < product.sellingPrice) {
        // The quota check lives in the WHERE clause so it happens at write
        // time: two buyers racing for the last discounted unit cannot both
        // read "1 left" and both get it. Losing the race is not an error —
        // it only means the discount is gone.
        const reserved = await tx.product.updateMany({
          where: {
            id: product.id,
            storeId,
            OR: [
              { saleQuota: null },
              { saleSold: { lte: (product.saleQuota ?? 0) - item.quantity } },
            ],
          },
          data: { saleSold: { increment: item.quantity } },
        });

        if (reserved.count === 0) unitPrice = product.sellingPrice;
        else saleQuotaUsed = true;
      }

      const shown = expectedUnitPrices?.[product.id];
      if (shown !== undefined && shown !== unitPrice) {
        priceChanges.push({ productId: product.id, name: product.name, shown, actual: unitPrice });
      }

      const itemTotal = unitPrice * item.quantity;
      subtotal += itemTotal;

      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          quantity: item.quantity,
          unitPrice,
          totalPrice: itemTotal,
          // Which lines actually took quota. A cancelled order returns exactly
          // these, instead of guessing from prices that may have moved since.
          saleQuotaUsed,
        },
      });

      // Reserved inside this same transaction: a nested $transaction would
      // commit the reservation independently of the order.
      await tx.stockLog.create({
        data: {
          productId: product.id,
          type: StockType.RESERVATION,
          quantity: item.quantity,
          previousStock: product.stock,
          newStock: product.stock - item.quantity,
          reason: `Reservation for order ${order.orderNumber}`,
          referenceId: order.id,
          userId: customerId,
        },
      });

      // Conditional for the same reason as the quota above: the stock check at
      // the top of the loop read a snapshot, and two orders for the last unit
      // would both pass it and both decrement, leaving stock negative.
      const stockTaken = await tx.product.updateMany({
        where: { id: product.id, storeId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (stockTaken.count === 0) {
        throw new Error(`Insufficient stock for product ${product.name}`);
      }
    }

    // Checked after every line is priced, so the customer sees the whole
    // difference at once rather than one product per round trip.
    if (priceChanges.length > 0) throw new PriceChangedError(priceChanges);

    let discount = 0;
    if (voucherCode) {
      // A voucher is a claimed right, and a claim belongs to a customer.
      if (!customerId) throw new VoucherError('NOT_CLAIMED');

      const voucher = await tx.voucher.findUnique({
        where: { storeId_code: { storeId, code: voucherCode.trim().toUpperCase() } },
      });
      if (!voucher) throw new VoucherError('NOT_FOUND');

      const claim = await tx.voucherClaim.findUnique({
        where: { voucherId_userId: { voucherId: voucher.id, userId: customerId } },
      });
      if (!claim) throw new VoucherError('NOT_CLAIMED');

      const eligibility = checkVoucherUsable(voucher, claim, subtotal, now);
      if (!eligibility.ok) throw new VoucherError(eligibility.reason);

      discount = resolveVoucherDiscount(voucher, subtotal);

      // Spent in the same transaction as the order, and conditioned on the
      // claim still being unused. `checkVoucherUsable` above only saw a
      // snapshot: two checkouts of one claim both read `usedAt: null` and both
      // pass it. The predicate is what actually decides who gets it.
      const spent = await tx.voucherClaim.updateMany({
        where: { id: claim.id, usedAt: null },
        data: { usedAt: now, orderId: order.id },
      });
      if (spent.count === 0) throw new VoucherError('ALREADY_USED');

      await tx.voucher.update({
        where: { id: voucher.id },
        data: { used: { increment: 1 } },
      });
    }

    return tx.order.update({
      where: { id: order.id },
      data: { subtotal, discount, totalAmount: subtotal - discount },
    });
  });
}

export async function processOrderPayment(
  orderId: string,
  userId?: string
): Promise<ProcessOrderResult> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: { include: { product: true } } },
    });

    if (!order) return { success: false, orderId, error: 'Order not found' };
    if (!['PAID', 'MANUAL_VERIFICATION'].includes(order.status)) {
      return { success: false, orderId, error: 'Order is not in a payable state' };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Stock was already decremented and logged as a RESERVATION when the order
      // was created. Moving it again here deducted it twice, and the stock check
      // below would fail because the reserved units are already gone from stock.
      const ledgerEntry = await recordOrderIncome(tx, order);

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'PROCESSING' },
      });

      return { success: true, orderId, ledgerEntry };
    });

    return result;
  } catch (error: any) {
    return { success: false, orderId, error: error.message };
  }
}

/**
 * Return everything an order reserved — stock, sale quota, and the voucher —
 * and mark it cancelled. Used when a manual payment is rejected, so a transfer
 * that never arrived does not permanently consume the last discounted unit or
 * burn a voucher the customer only gets to claim once.
 */
export async function releaseStock(
  orderId: string,
  userId?: string
): Promise<{ success: boolean; released?: number; error?: string }> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true, voucherClaim: true },
    });
    if (!order) return { success: false, error: 'Order not found' };
    if (order.status === 'CANCELLED') {
      return { success: false, error: 'Order is already cancelled' };
    }

    let released = 0;
    await prisma.$transaction(async (tx) => {
      for (const item of order.orderItems) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;

        await tx.stockLog.create({
          data: {
            productId: product.id,
            type: StockType.RETURN,
            quantity: item.quantity,
            previousStock: product.stock,
            newStock: product.stock + item.quantity,
            reason: `Release for cancelled order ${order.orderNumber}`,
            referenceId: order.id,
            userId,
          },
        });
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { increment: item.quantity } },
        });

        // Only the lines that actually took quota give it back; decrementing
        // every line would invent quota that was never spent.
        if (item.saleQuotaUsed) {
          await tx.product.updateMany({
            where: { id: product.id, saleSold: { gte: item.quantity } },
            data: { saleSold: { decrement: item.quantity } },
          });
        }

        released += item.quantity;
      }

      // An unpaid order should not leave the customer's one-shot voucher spent.
      if (order.voucherClaim) {
        await tx.voucherClaim.updateMany({
          where: { id: order.voucherClaim.id, orderId: order.id },
          data: { usedAt: null, orderId: null },
        });
        await tx.voucher.updateMany({
          where: { id: order.voucherClaim.voucherId, used: { gt: 0 } },
          data: { used: { decrement: 1 } },
        });
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });
    });

    return { success: true, released };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addStock(
  productId: string,
  quantity: number,
  reason: string,
  userId?: string
): Promise<{ success: boolean; stockLog?: any; error?: string }> {
  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return { success: false, error: 'Product not found' };

    const stockLog = await prisma.stockLog.create({
      data: {
        productId,
        type: StockType.IN,
        quantity,
        previousStock: product.stock,
        newStock: product.stock + quantity,
        reason,
        userId,
      },
    });

    await prisma.product.update({
      where: { id: productId },
      data: { stock: { increment: quantity } },
    });

    return { success: true, stockLog };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function adjustStock(
  productId: string,
  quantity: number,
  reason: string,
  userId?: string
): Promise<{ success: boolean; stockLog?: any; error?: string }> {
  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return { success: false, error: 'Product not found' };

    const newStock = product.stock + quantity;
    if (newStock < 0) return { success: false, error: 'Stock cannot be negative' };

    const stockLog = await prisma.stockLog.create({
      data: {
        productId,
        type: quantity > 0 ? StockType.IN : StockType.ADJUSTMENT,
        quantity: Math.abs(quantity),
        previousStock: product.stock,
        newStock,
        reason,
        userId,
      },
    });

    await prisma.product.update({
      where: { id: productId },
      data: { stock: newStock },
    });

    return { success: true, stockLog };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function recordExpense(
  storeId: string,
  amount: number,
  description: string,
  category: string
): Promise<{ success: boolean; ledger?: any; error?: string }> {
  try {
    const ledger = await prisma.ledger.create({
      data: {
        storeId,
        type: LedgerType.EXPENSE,
        amount: -amount,
        description,
        category,
        referenceType: 'EXPENSE',
      },
    });
    return { success: true, ledger };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function recordPettyCash(
  storeId: string,
  amount: number,
  description: string,
  type: 'IN' | 'OUT'
): Promise<{ success: boolean; pettyCash?: any; error?: string }> {
  try {
    const pettyCash = await prisma.pettyCash.create({
      data: {
        storeId,
        amount: type === 'IN' ? amount : -amount,
        description,
        type: type === 'IN' ? 'IN' : 'OUT',
      },
    });

    await prisma.ledger.create({
      data: {
        storeId,
        type: LedgerType.PETTY_CASH,
        amount: type === 'IN' ? amount : -amount,
        description: `Petty Cash ${type}: ${description}`,
        category: 'PETTY_CASH',
        referenceType: 'PETTY_CASH',
        referenceId: pettyCash.id,
      },
    });

    return { success: true, pettyCash };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getFinanceSummary(
  storeId: string,
  startDate?: Date,
  endDate?: Date
): Promise<FinanceSummary> {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const where = {
      storeId,
      createdAt: {
        gte: startDate || firstDayOfMonth,
        lte: endDate || lastDayOfMonth,
      },
    };

    const ledgers = await prisma.ledger.findMany({ where, orderBy: { createdAt: 'asc' } });

    let totalIncome = 0, totalExpense = 0, pettyCashBalance = 0, totalCapital = 0, totalLoans = 0;

    for (const ledger of ledgers) {
      switch (ledger.type) {
        case LedgerType.INCOME: totalIncome += ledger.amount; break;
        case LedgerType.EXPENSE: totalExpense += Math.abs(ledger.amount); break;
        case LedgerType.PETTY_CASH: pettyCashBalance += ledger.amount; break;
        case LedgerType.CAPITAL: totalCapital += ledger.amount; break;
        case LedgerType.LOAN: totalLoans += ledger.amount; break;
      }
    }

    return {
      totalIncome,
      totalExpense,
      pettyCashBalance,
      profitLoss: totalIncome - totalExpense,
      totalCapital,
      totalLoans,
    };
  } catch {
    return { totalIncome: 0, totalExpense: 0, pettyCashBalance: 0, profitLoss: 0, totalCapital: 0, totalLoans: 0 };
  }
}

export async function getStockHistory(productId: string, limit: number = 50) {
  try {
    return await prisma.stockLog.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
  } catch {
    return [];
  }
}

export async function getLowStockProducts(storeId: string, threshold: number = 5) {
  try {
    return await prisma.product.findMany({
      where: { storeId, stock: { lte: threshold }, isPublished: true },
      orderBy: { stock: 'asc' },
      select: { id: true, name: true, slug: true, sku: true, stock: true, minStock: true, sellingPrice: true },
    });
  } catch {
    return [];
  }
}

export default { createOrder, processOrderPayment, releaseStock,
  addStock,
  adjustStock,
  recordExpense,
  recordPettyCash,
  getFinanceSummary,
  getStockHistory,
  getLowStockProducts,
};