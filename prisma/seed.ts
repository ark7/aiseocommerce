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
    await prisma.articleProduct.deleteMany({ where: { article: { storeId: demoStore.id } } });
    await prisma.article.deleteMany({ where: { storeId: demoStore.id } });
    await prisma.productEvent.deleteMany({ where: { storeId: demoStore.id } });
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

  // The demo store's picklist. Written out here rather than imported from
  // lib/ledgerCategory because ts-node runs this file as ESM, where an
  // extensionless relative import of a .ts file does not resolve. SALES has to
  // appear either way: the ledger rows below are filed under that name, and a
  // category outside the master list is the split the master list exists to stop.
  await prisma.ledgerCategory.createMany({
    data: [
      { storeId: store.id, type: LedgerType.INCOME, name: 'SALES' },
      { storeId: store.id, type: LedgerType.INCOME, name: 'Pendapatan Lain' },
      { storeId: store.id, type: LedgerType.EXPENSE, name: 'Pembelian' },
      { storeId: store.id, type: LedgerType.EXPENSE, name: 'Operasional' },
      { storeId: store.id, type: LedgerType.REFUND, name: 'REFUND' },
      { storeId: store.id, type: LedgerType.PETTY_CASH, name: 'PETTY_CASH' },
    ],
    skipDuplicates: true,
  });
  console.log(`✅ Ledger categories seeded\n`);

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

  // Create Sample Articles
  console.log('📰 Creating sample articles...');
  const sampleArticles = [
    {
      id: 'demo-article-001',
      title: '5 Tips Memilih Sepatu Lari yang Nyaman untuk Pemula',
      slug: 'tips-memilih-sepatu-lari-pemula',
      content: `<p>Memulai hobi lari adalah keputusan yang bagus untuk kesehatan. Namun, memilih sepatu lari yang tepat bisa menjadi tantangan tersendiri bagi pemula. Sepatu yang tidak cocok bisa menyebabkan cedera, gatal, atau ketidaknyamanan saat berlari.</p><h2>1. Kenali Tipe Kaki Anda</h2><p>Sebelum membeli, ketahui apakah Anda memiliki kaki datar (flat feet), arc tinggi (high arches), atau arc normal. Ini menentukan jenis support yang dibutuhkan.</p><h2>2. Pilih Ukuran yang Tepat</h2><p>Ukuran sepatu lari biasanya lebih besar 0.5-1 ukuran dari sepatu biasa. Pastikan ada ruang sekitar 1 cm di ujung jari kaki.</p><h2>3. Perhatikan Cushioning</h2><p>Untuk pemula, sepatu dengan cushioning baik di area tumit dan telapak kaki depan akan mengurangi tekanan pada sendi.</p><h2>4. Coba Sebelum Beli</h2><p>Jangan ragu untuk mencoba berlari sebentar di toko. Rasakan apakah ada titik tekanan atau gesekan.</p><h2>5. Ganti Secara Berkala</h2><p>Sepatu lari memiliki umur pakai sekitar 600-800 km. Catat jarak tempuh Anda untuk mengetahui kapan waktunya mengganti.</p>`,
      seoTitle: '5 Tips Memilih Sepatu Lari Nyaman untuk Pemula | Panduan Lengkap',
      seoDescription: 'Belajar memilih sepatu lari yang tepat untuk pemula. Tips memilih ukuran, cushioning, dan tipe kaki agar lari nyaman dan bebas cedera.',
      imageUrl: 'https://picsum.photos/seed/running-shoes-tips/800/450',
      isFeatured: true,
    },
    {
      id: 'demo-article-002',
      title: 'Panduan Merawat Tas Ransel Agar Awet dan Tahan Lama',
      slug: 'panduan-merawat-tas-ransel',
      content: `<p>Tas ransel adalah investasi yang patut dijaga, terutama jika Anda menggunakannya sehari-hari untuk kerja, kuliah, atau traveling. Perawatan yang benar bisa memperpanjang umur tas hingga bertahun-tahun.</p><h2>Pembersihan Rutin</h2><p>Bersihkan tas setidaknya sebulan sekali. Kosongkan seluruh isi, gosok bagian dalam dengan sikat lembut, lalu lap dengan kain lembab.</p><h2>Hindari Mesin Cuci</h2><p>Kebanyakan tas ransel tidak cocok dicuci mesin. Agitasi dan deterjen keras bisa merusak lapisan tahan air dan jahitan.</p><h2>Pengeringan yang Benar</h2><p>Jangan jemur di bawah terik matahari langsung. Jemur di tempat teduh dengan sirkulasi udara baik. Buka semua kompartemen.</p><h2>Penyimpanan</h2><p>Simpan tas dalam kondisi kering, di tempat yang tidak lembab. Isi dengan kertas atau handuk agar bentuknya tetap terjaga.</p>`,
      seoTitle: 'Cara Merawat Tas Ransel Agar Awet & Tahan Lama - Tips Perawatan',
      seoDescription: 'Pelajari cara merawat tas ransel dengan benar: pembersihan rutin, hindari mesin cuci, pengeringan, dan penyimpanan yang benar agar tas awet bertahun-tahun.',
      imageUrl: 'https://picsum.photos/seed/backpack-care/800/450',
      isFeatured: true,
    },
    {
      id: 'demo-article-003',
      title: 'Tren Fashion Batik Modern 2024: Kombinasi Tradisi dan Gaya Kontemporer',
      slug: 'tren-fashion-batik-modern-2024',
      content: `<p>Batik tidak lagi identik dengan pakaian formal atau acara adat. Desainer lokal kini menghadirkan batik dengan potongan modern, warna-warna segar, dan desain yang cocok untuk aktivitas sehari-hari.</p><h2>Oversized Siluet</h2><p>Kemeja batik oversized menjadi favorit. Nyaman dipakai, stylish, dan cocok untuk laki-laki maupun perempuan.</p><h2>Mix & Match</h2><p>Padukan kemeja batik dengan jeans, celana chino, atau bahkan rok midi. Aksesoris minimalis seperti jam tangan kulit atau tas crossbody melengkapi penampilan.</p><h2>Batik Tulis vs Batik Cap</h2><p>Batik tulis memiliki nilai seni lebih tinggi dan motif unik, sementara batik cap lebih terjangkau dan konsisten. Pilih sesuai kebutuhan dan budget.</p>`,
      seoTitle: 'Tren Fashion Batik Modern 2024: Kombinasi Tradisi & Kontemporer',
      seoDescription: 'Temukan tren fashion batik modern 2024: oversized siluet, mix & match dengan jeans, perbedaan batik tulis dan cap. Stylish dengan identitas Indonesia.',
      imageUrl: 'https://picsum.photos/seed/batik-fashion/800/450',
      isFeatured: true,
    },
    {
      id: 'demo-article-004',
      title: 'Cara Menghemat Energi Listrik di Rumah: Tips Praktis untuk Tagihan Lebih Rendah',
      slug: 'cara-menghemat-energi-listrik-rumah',
      content: `<p>Tagihan listrik yang melonjak sering menjadi kekhawatiran. Berikut tips praktis yang bisa diterapkan sehari-hari untuk menghemat energi listrik tanpa mengorbankan kenyamanan.</p><h2>1. Gunakan Lampu LED</h2><p>Lampu LED menghemat hingga 80% energi dibanding bohlam pijar dan lebih awet.</p><h2>2. Cabut Stop Kontak yang Tidak Digunakan</h2><p>Perangkat dalam mode standby tetap mengonsumsi daya (phantom load). Cabut charger, TV, dan perangkat lain saat tidak dipakai.</p><h2>3. Atur Suhu AC dengan Bijak</h2><p>Setel AC pada 24-26°C. Setiap derajat di bawah 24°C meningkatkan konsumsi daya sekitar 5-10%.</p><h2>4. Manfaatkan Cahaya Alami</h2><p>Buka tirai siang hari untuk memaksimalkan cahaya matahari, mengurangi kebutuhan lampu buatan.</p><h2>5. Pilih Elektronik Hemat Energi</h2><p>Saat beli elektronik baru, cari label hemat energi (seperti bintang 4-5 pada label hemat energi Indonesia).</p>`,
      seoTitle: 'Cara Menghemat Energi Listrik di Rumah: Tips Praktis Tagihan Rendah',
      seoDescription: 'Tips hemat listrik praktis: ganti ke LED, cabut stop kontak standby, atur suhu AC 24-26°C, manfaatkan cahaya alami, pilih elektronik hemat energi.',
      imageUrl: 'https://picsum.photos/seed/energy-saving/800/450',
      isFeatured: true,
    },
    {
      id: 'demo-article-005',
      title: 'Panduan Memilih Laptop untuk Mahasiswa: Spesifikasi yang Perlu Diperhatikan',
      slug: 'panduan-memilih-laptop-mahasiswa',
      content: `<p>Laptop adalah alat utama mahasiswa saat ini. Dari tugas kuliah, presentasi, hingga hiburan, semuanya bergantung pada performa laptop. Berikut panduan memilih laptop yang tepat untuk mahasiswa.</p><h2>Prosesor (CPU)</h2><p>Minimal Intel Core i5 generasi ke-12/13 atau AMD Ryzen 5 seri 5000/6000. Untuk jurusan desain/teknik, pertimbangkan i7/Ryzen 7.</p><h2>RAM</h2><p>Minimal 8 GB, direkomendasikan 16 GB untuk multitasking lancar (browser banyak tab, IDE, video call bersamaan).</p><h2>Storage</h2><p>SSD NVMe minimal 512 GB. Hindari HDD karena lambat. 1 TB lebih aman untuk jangka panjang.</p><h2>Layar</h2><p>14-15.6 inci, resolusi Full HD (1920x1080) minimal. Panel IPS untuk warna akurat dan sudut pandang lebar.</p><h2>Baterai</h2><p>Cari laptop dengan daya tahan baterai minimal 8-10 jam penggunaan nyata (browsing/video).</p>`,
      seoTitle: 'Panduan Memilih Laptop Mahasiswa 2024: Spesifikasi & Rekomendasi',
      seoDescription: 'Panduan lengkap memilih laptop untuk mahasiswa: prosesor i5/Ryzen 5 minimal, RAM 16GB, SSD 512GB, layar IPS FHD, baterai 8+ jam. Cocok untuk kuliah & tugas.',
      imageUrl: 'https://picsum.photos/seed/student-laptop/800/450',
      isFeatured: true,
    },
    {
      id: 'demo-article-006',
      title: 'Resep Masakan Rumahan Sehat & Bergizi untuk Menu Mingguan',
      slug: 'resep-masakan-rumahan-sehat-bergizi',
      content: `<p>Memasak sendiri di rumah bukan hanya lebih hemat, tapi juga memastikan kebersihan dan komposisi gizi yang terkontrol. Berikut ide menu sehat untuk seminggu.</p><h2>Senin: Nasi Merah + Ikan Bakar + Sayur Bayam</h2><p>Ikan kaya protein dan omega-3. Bayam menyediakan zat besi dan vitamin A.</p><h2>Selasa: Ayam Panggang + Quinoa + Salad Buah</h2><p>Ayam protein hewani rendah lemak. Quinoa karbohidrat kompleks kaya protein nabati.</p><h2>Rabu: Tumis Tahu Tempe + Sayur Campur</h2><p>Protein nabati terjangkau dan kaya serat. Sayur campur untuk vitamin lengkap.</p><h2>Kamis: Sup Ayam Jagung + Roti Gandum</h2><p>Sup hangat menenangkan, jagung serat, roti gandum karbo kompleks.</p><h2>Jumat: Udang Saus Padang (kurangi santan) + Kangkung</h2><p>Udang protein rendah kalori. Kangkung vitamin K dan kalsium.</p><h2>Sabtu: Nasi Goreng Brown Rice + Telur + Sayur</h2><p>Brown rice indeks glikemik lebih rendah. Telur protein lengkap.</p><h2>Minggu: Bebas (Cheat Day Terkontrol)</h2><p>Nikmati makanan favorit dengan porsi terkontrol. Balance adalah kunci.</p>`,
      seoTitle: 'Menu Masakan Rumahan Sehat Mingguan: Resep Bergizi & Hemat',
      seoDescription: 'Ide menu masakan rumahan sehat 7 hari: nasi merah ikan bakar, ayam panggang quinoa, tumis tahu tempe, sup ayam, udang saus padang, nasi goreng brown rice.',
      imageUrl: 'https://picsum.photos/seed/healthy-meals/800/450',
      isFeatured: true,
    },
  ];

  for (const articleData of sampleArticles) {
    const article = await prisma.article.create({
      data: {
        ...articleData,
        storeId: store.id,
      },
    });

    // Link first 2 articles with some featured products
    if (sampleArticles.indexOf(articleData) < 2) {
      const featuredProds = products.filter(p => p.isFeatured).slice(0, 3);
      for (const prod of featuredProds) {
        await prisma.articleProduct.create({
          data: {
            articleId: article.id,
            productId: prod.id,
          },
        });
      }
    }

    console.log(`  ✓ ${article.title}`);
  }
  console.log(`✅ ${sampleArticles.length} sample articles created\n`);

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
