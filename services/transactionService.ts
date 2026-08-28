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
      const stockLogs: any[] = [];
      
      for (const item of order.orderItems) {
        const product = item.product;
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}`);
        }
        
        const stockLog = await tx.stockLog.create({
          data: {
            productId: product.id,
            type: StockType.OUT,
            quantity: item.quantity,
            previousStock: product.stock,
            newStock: product.stock - item.quantity,
            reason: `Order ${order.id} - ${order.orderNumber}`,
            referenceId: order.id,
            userId,
          },
        });
        stockLogs.push(stockLog);
        
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: item.quantity } },
        });
      }
      
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
      
      return { success: true, orderId, stockLogs, ledgerEntry };
    });
    
    return result;
  } catch (error: any) {
    return { success: false, orderId, error: error.message };
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
  category: string,
  userId?: string
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
        userId,
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
  type: 'IN' | 'OUT',
  userId?: string
): Promise<{ success: boolean; pettyCash?: any; error?: string }> {
  try {
    const pettyCash = await prisma.pettyCash.create({
      data: {
        storeId,
        amount: type === 'IN' ? amount : -amount,
        description,
        type: type === 'IN' ? 'IN' : 'OUT',
        userId,
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

export default {
  processOrderPayment,
  addStock,
  adjustStock,
  recordExpense,
  recordPettyCash,
  getFinanceSummary,
  getStockHistory,
  getLowStockProducts,
};
