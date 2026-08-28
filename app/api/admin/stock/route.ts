import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { addStock, adjustStock, getStockHistory, getLowStockProducts } from '@/services/transactionService';
import { z } from 'zod';

const addStockSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().min(1),
  reason: z.string().min(1),
});

const adjustStockSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int(),
  reason: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await verifyToken(token);
    if (!user || !['ADMIN', 'STAFF'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin/Staff access required' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const lowStock = searchParams.get('lowStock');
    const limit = parseInt(searchParams.get('limit') || '50');
    const threshold = parseInt(searchParams.get('threshold') || '5');
    
    // GET /api/admin/stock?lowStock=true - Get low stock products
    if (lowStock === 'true') {
      const products = await getLowStockProducts(user.storeId, threshold);
      return NextResponse.json({ success: true, products });
    }
    
    // GET /api/admin/stock?productId=xxx - Get stock history
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });
    
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    if (product.storeId !== user.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    
    const history = await getStockHistory(productId, limit);
    return NextResponse.json({ success: true, history });
  } catch (error) {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await verifyToken(token);
    if (!user || !['ADMIN', 'STAFF'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin/Staff access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const validation = addStockSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    
    const { productId, quantity, reason } = validation.data;
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    if (product.storeId !== user.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    
    const result = await addStock(productId, quantity, reason, user.id);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    
    return NextResponse.json({ success: true, stockLog: result.stockLog });
  } catch (error) {
    return NextResponse.json({ error: 'Add stock failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await verifyToken(token);
    if (!user || !['ADMIN', 'STAFF'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin/Staff access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const validation = adjustStockSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    
    const { productId, quantity, reason } = validation.data;
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    if (product.storeId !== user.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    
    const result = await adjustStock(productId, quantity, reason, user.id);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    
    return NextResponse.json({ success: true, stockLog: result.stockLog });
  } catch (error) {
    return NextResponse.json({ error: 'Adjust stock failed' }, { status: 500 });
  }
}
