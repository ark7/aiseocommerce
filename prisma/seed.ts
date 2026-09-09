/**
 * AI SEO E-Commerce SaaS - Seed Data Generator
 * 
 * Usage:
 *   npx prisma db seed
 *   OR
 *   npx ts-node prisma/seed.ts
 * 
 * This script creates dummy data for:
 * - Store
 * - Categories
 * - Products with images
 * - Users (Admin, Staff, Customer)
 * - Sample orders
 * - Sample payments
 */

import { PrismaClient, Role, OrderStatus, PaymentStatus, PaymentMethod, StockType, LedgerType } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Configuration
const STORE_DOMAIN = 'demo-store.local';
const STORE_NAME = 'AI SEO Demo Store';
const NUM_CATEGORIES = 5;
const NUM_PRODUCTS = 20;
const NUM_CUSTOMERS = 10;

// Helper to generate Indonesian product names
const indonesianProducts = [
  { name: 'Kemeja Batik Premium', shortDesc: 'Kemeja batik motif tradisional', description: 'Kemeja batik dengan motif tradisional Indonesia, terbuat dari katun berkualitas tinggi. Cocok untuk acara formal maupun kasual.', price: 250000, stock: 50 },
  { name: 'Tas Ransel Wanita', shortDesc: 'Tas ransel trendy dan nyaman', description: 'Tas ransel wanita dengan desain modern dan banyak kantong. Terbuat dari bahan kanvas tahan air.', price: 350000, stock: 30 },
  { name: 'Sepatu Sneakers', shortDesc: 'Sepatu sneakers nyaman', description: 'Sepatu sneakers dengan sol karet anti slip. Tersedia dalam berbagai warna.', price: 450000, stock: 40 },
  { name: 'Smartphone Android', shortDesc: 'Smartphone Android terbaru', description: 'Smartphone Android dengan layar 6.5 inch, RAM 8GB, storage 128GB. Kamera 48MP.', price: 3500000, stock: 25 },
  { name: 'Laptop Gaming', shortDesc: 'Laptop gaming high-performance', description: 'Laptop gaming dengan prosesor Intel i7, RAM 16GB, SSD 512GB, GPU RTX 3060.', price: 18000000, stock: 15 },
  { name: 'Headset Wireless', shortDesc: 'Headset wireless noise cancelling', description: 'Headset wireless dengan fitur noise cancelling, baterai tahan 20 jam.', price: 1800000, stock: 20 },
  { name: 'Jam Tangan Pria', shortDesc: 'Jam tangan pria elegan', description: 'Jam tangan pria dengan tali kulit asli, waterproof sampai 50m.', price: 1200000, stock: 18 },
  { name: 'Kacamata Hitam', shortDesc: 'Kacamata hitam stylish', description: 'Kacamata hitam dengan lensa UV protection, frame ringan dan nyaman.', price: 500000, stock: 35 },
  { name: 'Dompet Kulit', shortDesc: 'Dompet kulit asli', description: 'Dompet kulit asli dengan banyak slot kartu dan kantong uang.', price: 450000, stock: 22 },
  { name: 'Parfum Wanita', shortDesc: 'Parfum wanita long-lasting', description: 'Parfum wanita dengan aroma floral fresh, tahan sampai 24 jam.', price: 650000, stock: 28 },
  { name: 'Koper Travel', shortDesc: 'Koper travel besar', description: 'Koper travel dengan roda, kapasitas 60L, tahan air.', price: 2200000, stock: 12 },
  { name: 'Set Makan', shortDesc: 'Set makan stainless steel', description: 'Set makan stainless steel lengkap dengan piring, mangkuk, sendok, garpu.', price: 350000, stock: 45 },
  { name: 'Blender', shortDesc: 'Blender high-speed', description: 'Blender dengan motor 1000W, bisa menghancurkan es dengan mudah.', price: 850000, stock: 18 },
  { name: 'Rice Cooker', shortDesc: 'Rice cooker otomatis', description: 'Rice cooker otomatis dengan kapasitas 5 liter, fitur keep warm.', price: 650000, stock: 22 },
  { name: 'Televisi LED', shortDesc: 'Televisi LED 4K', description: 'Televisi LED 55 inch dengan resolusi 4K, Smart TV dengan Android.', price: 8500000, stock: 8 },
  { name: 'Kulkas 2 Pintu', shortDesc: 'Kulkas 2 pintu hemat energi', description: 'Kulkas 2 pintu dengan kapasitas 300L, fitur no frost.', price: 6500000, stock: 6 },
  { name: 'Mesin Cuci', shortDesc: 'Mesin cuci otomatis', description: 'Mesin cuci otomatis 8 kg, fitur turbo wash.', price: 4500000, stock: 10 },
  { name: 'AC Split', shortDesc: 'AC Split 1 PK', description: 'AC Split 1 PK, hemat energi, pendingin cepat.', price: 5500000, stock: 5 },
  { name: 'Kompor Gas', shortDesc: 'Kompor gas 2 tungku', description: 'Kompor gas 2 tungku, bahan stainless steel, tahan karat.', price: 1200000, stock: 15 },
  { name: 'Panci Set', shortDesc: 'Set panci stainless steel', description: 'Set panci stainless steel lengkap untuk masak sehari-hari.', price: 750000, stock: 20 },
];

// Helper to generate SKU
function generateSKU(name: string, index: number): string {
  const cleanName = name.replace(/\s+/g, '-').toUpperCase().substring(0, 8);
  return `SKU-${cleanName}-${String(index + 1).padStart(3, '0')}`;
}

// Helper to generate slug
function generateSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// Helper to get random subset
function getRandomSubset<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Generate placeholder image URLs
function getPlaceholderImage(index: number, category?: string): string {
  const categories = {
    'Fashion': ['fashion', 'clothing', 'accessories'],
    'Elektronik': ['electronics', 'gadgets', 'devices'],
    'Rumah Tangga': ['home', 'kitchen', 'appliances'],
    'Alat Rumah': ['home', 'kitchen', 'appliances'],
  };
  
  const baseCategory = category && categories[category as keyof typeof categories] 
    ? getRandomSubset(categories[category as keyof typeof categories], 1)[0]
    : 'products';
  
  return `https://picsum.photos/seed/${baseCategory}-${index}/400/400`;
}

async function main() {
  console.log('🌱 Starting seed data generation...\n');

  // Clean existing data for demo store
  console.log('🧹 Cleaning existing demo data...');
  
  const demoStore = await prisma.store.findUnique({ 
    where: { domain: STORE_DOMAIN } 
  });
  
  if (demoStore) {
    // Delete existing data
    await prisma.orderItem.deleteMany({ where: { product: { storeId: demoStore.id } } });
    await prisma.payment.deleteMany({ where: { order: { storeId: demoStore.id } } });
    await prisma.order.deleteMany({ where: { storeId: demoStore.id } });
    await prisma.productImage.deleteMany({ where: { product: { storeId: demoStore.id } } });
    await prisma.product.deleteMany({ where: { storeId: demoStore.id } });
    await prisma.category.deleteMany({ where: { storeId: demoStore.id } });
    await prisma.user.deleteMany({ where: { storeId: demoStore.id } });
    await prisma.store.deleteMany({ where: { id: demoStore.id } });
    console.log('✅ Existing demo data cleaned\n');
  }

  // Create Store
  console.log('🏪 Creating store...');
  const store = await prisma.store.create({
    data: {
      id: 'demo-store-001',
      name: STORE_NAME,
      domain: STORE_DOMAIN,
      logo: 'https://picsum.photos/seed/store-logo/200/200',
      address: 'Jl. Raya Demo No. 123, Jakarta Selatan',
      phone: '+62 21 12345678',
      email: 'demo@aiseocommerce.local',
      settings: {
        create: {
          businessName: STORE_NAME,
          businessAddress: 'Jl. Raya Demo No. 123, Jakarta Selatan, Indonesia',
          businessPhone: '+62 21 12345678',
          midtransMerchantId: 'DEMO_MERCHANT',
          midtransClientKey: 'DEMO_CLIENT_KEY',
          midtransServerKey: 'DEMO_SERVER_KEY',
        },
      },
    },
    include: { settings: true },
  });
  console.log(`✅ Store created: ${store.name} (${store.domain})\n`);

  // Create Categories
  console.log('📁 Creating categories...');
  const categories = [];
  const categoryNames = ['Fashion', 'Elektronik', 'Alat Rumah', 'Rumah Tangga', 'Lainnya'];
  
  for (let i = 0; i < NUM_CATEGORIES; i++) {
    const category = await prisma.category.create({
      data: {
        id: `demo-cat-${String(i + 1).padStart(2, '0')}`,
        storeId: store.id,
        name: categoryNames[i] || `Kategori ${i + 1}`,
        slug: generateSlug(categoryNames[i] || `kategori-${i + 1}`),
        description: faker.lorem.sentence(),
      },
    });
    categories.push(category);
    console.log(`  ✓ ${category.name}`);
  }
  console.log(`✅ ${categories.length} categories created\n`);

  // Create Products
  console.log('📦 Creating products...');
  const products = [];
  
  for (let i = 0; i < NUM_PRODUCTS; i++) {
    const productData = indonesianProducts[i] || {
      name: faker.commerce.productName(),
      shortDesc: faker.commerce.productDescription().substring(0, 100),
      description: faker.commerce.productDescription(),
      price: faker.number.int({ min: 10000, max: 10000000 }),
      stock: faker.number.int({ min: 5, max: 100 }),
    };
    
    const category = getRandomSubset(categories, 1)[0];
    const basePrice = productData.price * 0.8;
    const discountPrice = faker.datatype.boolean() ? productData.price * 0.9 : null;
    const sku = generateSKU(productData.name, i);
    const slug = generateSlug(productData.name);
    
    const product = await prisma.product.create({
      data: {
        id: `demo-prod-${String(i + 1).padStart(3, '0')}`,
        storeId: store.id,
        sku,
        name: productData.name,
        slug,
        description: productData.description,
        shortDescription: productData.shortDesc,
        basePrice,
        sellingPrice: productData.price,
        discountPrice,
        stock: productData.stock,
        minStock: 5,
        isPublished: true,
        isFeatured: i < 8, // First 8 products are featured
        categoryId: category.id,
        images: {
          create: [
            {
              url: getPlaceholderImage(i, category.name),
              altText: `${productData.name} - Image 1`,
              order: 0,
              isPrimary: true,
            },
            {
              url: getPlaceholderImage(i + 100, category.name),
              altText: `${productData.name} - Image 2`,
              order: 1,
              isPrimary: false,
            },
          ],
        },
      },
      include: { images: true, category: true },
    });
    products.push(product);
    console.log(`  ✓ ${product.name} (Rp ${product.sellingPrice.toLocaleString('id-ID')})`);
  }
  console.log(`✅ ${products.length} products created\n`);

  // Create Users
  console.log('👥 Creating users...');
  
  // Admin user
  const adminUser = await prisma.user.create({
    data: {
      id: 'demo-admin-001',
      storeId: store.id,
      email: 'admin@demo-store.local',
      passwordHash: '$2a$10$n0.McLoLU/q/CWNQnT/NfOve.baoxIJW8zIW41IxJzJXCrZBsu4AK', // bcrypt hash of 'password'
      firstName: 'Admin',
      lastName: 'Demo',
      phone: '+62 812 3456 7890',
      role: Role.ADMIN,
      isActive: true,
      emailVerified: true,
    },
  });
  console.log(`  ✓ Admin: ${adminUser.email}`);

  // Staff user
  const staffUser = await prisma.user.create({
    data: {
      id: 'demo-staff-001',
      storeId: store.id,
      email: 'staff@demo-store.local',
      passwordHash: '$2a$10$n0.McLoLU/q/CWNQnT/NfOve.baoxIJW8zIW41IxJzJXCrZBsu4AK', // bcrypt hash of 'password'
      firstName: 'Staff',
      lastName: 'Demo',
      phone: '+62 812 3456 7891',
      role: Role.STAFF,
      isActive: true,
      emailVerified: true,
    },
  });
  console.log(`  ✓ Staff: ${staffUser.email}`);

  // Create Customers
  const customers = [];
  for (let i = 0; i < NUM_CUSTOMERS; i++) {
    const customer = await prisma.user.create({
      data: {
        id: `demo-customer-${String(i + 1).padStart(2, '0')}`,
        storeId: store.id,
        email: `customer${i + 1}@demo-store.local`,
        passwordHash: '$2a$10$n0.McLoLU/q/CWNQnT/NfOve.baoxIJW8zIW41IxJzJXCrZBsu4AK', // bcrypt hash of 'password'
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        phone: faker.phone.number(),
        role: Role.CUSTOMER,
        isActive: true,
        emailVerified: true,
      },
    });
    customers.push(customer);
    console.log(`  ✓ Customer: ${customer.email}`);
  }
  console.log(`✅ ${customers.length + 2} users created\n`);

  // Create Sample Orders
  console.log('📋 Creating sample orders...');
  for (let i = 0; i < 5; i++) {
    const customer = getRandomSubset(customers, 1)[0];
    const selectedProducts = getRandomSubset(products, faker.number.int({ min: 1, max: 3 }));
    
    let subtotal = 0;
    const orderItems = selectedProducts.map(product => {
      const quantity = faker.number.int({ min: 1, max: Math.min(5, product.stock) });
      const itemTotal = product.sellingPrice * quantity;
      subtotal += itemTotal;
      return {
        productId: product.id,
        quantity,
        unitPrice: product.sellingPrice,
        totalPrice: itemTotal,
      };
    });
    
    const taxAmount = 0;
    const shippingCost = faker.number.int({ min: 0, max: 50000 });
    const discount = 0;
    const totalAmount = subtotal + taxAmount + shippingCost - discount;
    const statuses = [OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.COMPLETED];
    const status = getRandomSubset(statuses, 1)[0];
    
    const order = await prisma.order.create({
      data: {
        id: `demo-order-${String(i + 1).padStart(3, '0')}`,
        storeId: store.id,
        orderNumber: `DEMO-ORD-${String(i + 1).padStart(3, '0')}`,
        userId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        subtotal,
        taxAmount,
        shippingCost,
        discount,
        totalAmount,
        status,
        orderItems: { create: orderItems },
      },
      include: { orderItems: true },
    });
    console.log(`  ✓ Order ${order.orderNumber} - ${status} - Rp ${totalAmount.toLocaleString('id-ID')}`);
  }
  console.log(`✅ Sample orders created\n`);

  // Create Sample Payments
  console.log('💳 Creating sample payments...');
  const orders = await prisma.order.findMany({ 
    where: { storeId: store.id },
    include: { user: true },
  });
  
  for (const order of orders) {
    const paymentMethod = faker.datatype.boolean() ? PaymentMethod.MANUAL : PaymentMethod.MIDTRANS;
    const status = order.status === OrderStatus.PAID || order.status === OrderStatus.PROCESSING 
      ? PaymentStatus.PAID 
      : PaymentStatus.PENDING;
    
    await prisma.payment.create({
      data: {
        id: `demo-payment-${order.id.split('-').pop()}`,
        orderId: order.id,
        method: paymentMethod,
        amount: order.totalAmount,
        transactionId: paymentMethod === PaymentMethod.MIDTRANS 
          ? `MIDTRANS-${order.id}` 
          : null,
        gatewayResponse: paymentMethod === PaymentMethod.MIDTRANS 
          ? JSON.stringify({ status: 'settlement', transaction_id: `MIDTRANS-${order.id}` })
          : null,
        status,
        proofUrl: paymentMethod === PaymentMethod.MANUAL 
          ? `https://picsum.photos/seed/proof-${order.id}/400/300`
          : null,
        proofFile: paymentMethod === PaymentMethod.MANUAL 
          ? `proof-${order.id}.jpg`
          : null,
        verifiedById: status === PaymentStatus.PAID ? adminUser.id : null,
        verifiedAt: status === PaymentStatus.PAID ? new Date() : null,
      },
    });
  }
  console.log(`✅ Sample payments created\n`);

  // Create Stock Logs
  console.log('📊 Creating stock logs...');
  for (const product of getRandomSubset(products, 10)) {
    const quantity = faker.number.int({ min: 1, max: 10 });
    const oldStock = product.stock - quantity;
    const newStock = product.stock;
    
    await prisma.stockLog.create({
      data: {
        id: `demo-stock-${product.id}`,
        productId: product.id,
        type: StockType.IN,
        quantity,
        previousStock: oldStock,
        newStock,
        reason: 'Initial stock setup',
        referenceId: product.id,
        userId: adminUser.id,
      },
    });
  }
  console.log(`✅ Stock logs created\n`);

  // Create Ledger Entries
  console.log('💰 Creating ledger entries...');
  const paidOrders = await prisma.order.findMany({ 
    where: { storeId: store.id, status: OrderStatus.PAID },
    include: { orderItems: true },
  });
  
  for (const order of paidOrders) {
    await prisma.ledger.create({
      data: {
        id: `demo-ledger-${order.id}`,
        storeId: store.id,
        type: LedgerType.INCOME,
        amount: order.totalAmount,
        description: `Order ${order.orderNumber} - ${order.orderItems.length} items`,
        referenceId: order.id,
        referenceType: 'ORDER',
        category: 'SALES',
      },
    });
  }
  console.log(`✅ Ledger entries created\n`);

  console.log('🎉 Seed data generation complete!\n');
  console.log('='.repeat(60));
  console.log('SEED DATA SUMMARY');
  console.log('='.repeat(60));
  console.log(`Store:           ${store.name} (${store.domain})`);
  console.log(`Categories:      ${categories.length}`);
  console.log(`Products:        ${products.length}`);
  console.log(`Users:           ${customers.length + 2} (Admin, Staff, Customers)`);
  console.log(`Orders:          ${orders.length}`);
  console.log(`Payments:        ${orders.length}`);
  console.log(`Stock Logs:      10`);
  console.log(`Ledger Entries:  ${paidOrders.length}`);
  console.log('='.repeat(60));
  console.log('\n✨ Demo data ready for preview!');
  console.log(`\nAccess your store at: http://${STORE_DOMAIN}`);
  console.log('\nCredentials:');
  console.log(`  Admin:    admin@demo-store.local / password`);
  console.log(`  Staff:    staff@demo-store.local / password`);
  console.log(`  Customer: customer1@demo-store.local / password`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
