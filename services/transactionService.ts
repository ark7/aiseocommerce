import { prisma } from '@/lib/prisma';
import { LedgerType, StockType } from '@prisma/client';

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

export async function createOrder(
  storeId: string,
  items: { productId: string; quantity: number }[],
  customerId?: string,
  attribution?: Record<string, unknown>
) {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Create order record
      // Generate a simple order number (you might want to improve this)
      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const order = await tx.order.create({
        data: {
          storeId,
          userId: customerId, // assuming customerId is the userId for now
          orderNumber,
          totalAmount: 0, // we'll calculate below
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

      // 2. Create order items and calculate total
      let totalAmount = 0;
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }
        // Ensure we have enough stock (should have been reserved, but double-check)
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}`);
        }
        const itemTotal = product.sellingPrice * item.quantity;
        totalAmount += itemTotal;

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: product.id,
            quantity: item.quantity,
            unitPrice: product.sellingPrice,
            totalPrice: itemTotal,
          },
        });
      }

      // 3. Update order with calculated totals
      await tx.order.update({
        where: { id: order.id },
        data: {
          totalAmount,
          subtotal: totalAmount, // assuming no tax/shipping/discount for now
        },
      });

      // 4. Reserve stock inside this same transaction. Calling reserveStock()
      //    here would open a nested transaction and commit the reservation
      //    independently of the order.
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (!product) {
          throw new Error(`Product ${item.productId} not found`)
        }
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}`)
        }
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
        })
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: item.quantity } },
        })
      }

      return order;
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Reserve stock for items before order creation.
 * Returns true on success, throws on failure.
 */
export async function reserveStock(
  storeId: string,
  items: { productId: string; quantity: number }[],
  userId?: string
): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (!product) {
          throw new Error(`Product ${item.productId} not found`)
        }
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}`)
        }
        // create reservation log
        await tx.stockLog.create({
          data: {
            productId: product.id,
            type: 'RESERVATION' as any,
            quantity: item.quantity,
            previousStock: product.stock,
            newStock: product.stock - item.quantity,
            reason: `Reservation for order creation`,
            referenceId: null,
            userId,
          },
        })
        // decrement stock atomically
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: item.quantity } },
        })
      }
    })
    return true
  } catch (e) {
    // let caller handle
    throw e
  }
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
      const ledgerEntry = await tx.ledger.create({
        data: {
          storeId: order.storeId,
          type: LedgerType.INCOME,
          amount: order.totalAmount,
          description: `Order ${order.orderNumber} - ${order.orderItems.length} items`,
          referenceId: order.id,
          referenceType: 'ORDER',
          category: 'SALES',
        },
      });

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
 * Return reserved stock for an order and mark it cancelled.
 * Used when a manual payment is rejected, so the units go back on sale.
 */
export async function releaseStock(
  orderId: string,
  userId?: string
): Promise<{ success: boolean; released?: number; error?: string }> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
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
        released += item.quantity;
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

export default { createOrder, processOrderPayment, reserveStock, releaseStock,
  addStock,
  adjustStock,
  recordExpense,
  recordPettyCash,
  getFinanceSummary,
  getStockHistory,
  getLowStockProducts,
};