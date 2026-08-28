import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { processOrderPayment } from '@/services/transactionService';
import { z } from 'zod';

const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().min(1),
    variation: z.string().optional(),
  })),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  shippingAddress: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    let user = null;
    if (token) user = await verifyToken(token);
    
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const orderBy = searchParams.get('orderBy') || 'createdAt';
    const orderDirection = searchParams.get('orderDirection') || 'desc';
    
    const where: any = {};
    if (storeId) where.storeId = storeId;
    else if (user) {
      if (user.role === 'CUSTOMER') where.userId = user.id;
      else where.storeId = user.storeId;
    } else {
      return NextResponse.json({ success: true, orders: [], pagination: { page: 1, limit: 0, total: 0, totalPages: 0 } });
    }
    if (status) where.status = status;
    if (search) where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { customerName: { contains: search, mode: 'insensitive' } },
      { customerEmail: { contains: search, mode: 'insensitive' } },
    ];
    
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { [orderBy]: orderDirection },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          orderItems: { include: { product: { select: { id: true, name: true, slug: true, sellingPrice: true, images: { where: { isPrimary: true }, take: 1 } } } } },
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.order.count({ where }),
    ]);
    
    return NextResponse.json({
      success: true,
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    let user = null;
    if (token) user = await verifyToken(token);
    
    const body = await request.json();
    const validation = createOrderSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    
    const { items, customerName, customerEmail, customerPhone, shippingAddress, notes } = validation.data;
    const host = request.headers.get('host');
    const domain = host?.split(':')[0];
    const store = await prisma.store.findUnique({ where: { domain } });
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    
    let subtotal = 0;
    const orderItems: any[] = [];
    
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 404 });
      if (product.storeId !== store.id) return NextResponse.json({ error: `Product not from this store` }, { status: 400 });
      if (!product.isPublished) return NextResponse.json({ error: `Product not available` }, { status: 400 });
      if (product.stock < item.quantity) return NextResponse.json({ error: `Insufficient stock for ${product.name}` }, { status: 400 });
      
      const itemTotal = product.sellingPrice * item.quantity;
      subtotal += itemTotal;
      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.sellingPrice,
        totalPrice: itemTotal,
        variation: item.variation,
      });
    }
    
    const taxAmount = 0;
    const shippingCost = 0;
    const discount = 0;
    const totalAmount = subtotal + taxAmount + shippingCost - discount;
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const order = await prisma.order.create({
      data: {
        storeId: store.id,
        orderNumber,
        userId: user?.id,
        customerName,
        customerEmail,
        customerPhone,
        subtotal,
        taxAmount,
        shippingCost,
        discount,
        totalAmount,
        shippingAddress,
        notes,
        status: 'PENDING',
        orderItems: { create: orderItems },
      },
      include: { orderItems: { include: { product: true } } },
    });
    
    return NextResponse.json({ success: true, order });
  } catch (error) {
    return NextResponse.json({ error: 'Create failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await verifyToken(token);
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    
    const body = await request.json();
    const { orderId, status } = body;
    if (!orderId || !status) return NextResponse.json({ error: 'orderId and status required' }, { status: 400 });
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.storeId !== user.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    
    await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
    
    if (status === 'PAID') {
      await processOrderPayment(orderId, user.id);
    }
    
    return NextResponse.json({ success: true, message: 'Order updated', order: { id: orderId, status } });
  } catch (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
