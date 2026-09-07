import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// String constants for SQLite compatibility (no enums)
const Condition = {
  NEW: 'NEW',
  LIKE_NEW: 'LIKE_NEW',
  GOOD: 'GOOD',
  FAIR: 'FAIR'
};

const ItemStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  SOLD: 'SOLD',
  ARCHIVED: 'ARCHIVED'
};

const OrderStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  PAID: 'PAID',
  SHIPPED: 'SHIPPED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

const categories = [
  { name: 'Components', slug: 'components' },
  { name: 'Development Boards', slug: 'dev-boards' },
  { name: 'Measurement Tools', slug: 'measurement-tools' },
  { name: 'Tools & Accessories', slug: 'tools-accessories' },
  { name: 'Sensors', slug: 'sensors' },
  { name: 'Power & Batteries', slug: 'power-batteries' },
  { name: 'Cables & Connectors', slug: 'cables-connectors' },
  { name: 'Robotics', slug: 'robotics' },
  { name: 'Displays', slug: 'displays' },
  { name: 'Kits & Bundles', slug: 'kits-bundles' }
];

const users = [
  {
    email: 'seller@circulink.dev',
    passwordHash: 'seeded-password-hash',
    name: 'Nora Chen',
    role: 'USER',
    profile: {
      displayName: 'Circuit Vendor',
      avatarUrl: '/uploads/sample-seller.jpg',
      university: 'Duke Kunshan University',
      phone: '+86 138 0000 1001',
      bio: 'Focused on second-hand boards and lab gear.'
    }
  },
  {
    email: 'seller2@circulink.dev',
    passwordHash: 'seeded-password-hash',
    name: 'Evan Moore',
    role: 'USER',
    profile: {
      displayName: 'Lab Bench Supplies',
      avatarUrl: '/uploads/sample-seller-2.jpg',
      university: 'Stanford University',
      phone: '+1 650 555 0199',
      bio: 'Selling surplus lab equipment from our robotics club.'
    }
  },
  {
    email: 'buyer@circulink.dev',
    passwordHash: 'seeded-password-hash',
    name: 'Riley Patel',
    role: 'USER',
    profile: {
      displayName: 'Circuit Learner',
      avatarUrl: '/uploads/sample-buyer.jpg',
      university: 'Duke University',
      phone: '+1 919 555 0147',
      bio: 'DIY learner, always looking for starter kits.'
    }
  },
  {
    email: 'buyer2@circulink.dev',
    passwordHash: 'seeded-password-hash',
    name: 'Sophia Lin',
    role: 'USER',
    profile: {
      displayName: 'Maker Club Buyer',
      avatarUrl: '/uploads/sample-buyer-2.jpg',
      university: 'UC Berkeley',
      phone: '+1 510 555 0108',
      bio: 'Buying supplies for weekend maker events.'
    }
  }
];

const sampleItems = [
  {
    title: 'Arduino Uno R3',
    description: 'Beginner-friendly board with pin labels and USB cable.',
    price: 158.00,
    condition: Condition.GOOD,
    status: ItemStatus.ACTIVE,
    images: ['https://via.placeholder.com/300?text=Arduino+Uno'],
    categorySlug: 'dev-boards',
    sellerEmail: 'seller@circulink.dev'
  },
  {
    title: 'Raspberry Pi 4B 4GB',
    description: 'Includes heatsinks and case, boots reliably.',
    price: 299.00,
    condition: Condition.LIKE_NEW,
    status: ItemStatus.ACTIVE,
    images: ['https://via.placeholder.com/300?text=Raspberry+Pi'],
    categorySlug: 'dev-boards',
    sellerEmail: 'seller@circulink.dev'
  },
  {
    title: 'Digital Multimeter',
    description: 'Backlit display with fresh probes.',
    price: 79.00,
    condition: Condition.GOOD,
    status: ItemStatus.ACTIVE,
    images: ['https://via.placeholder.com/300?text=Multimeter'],
    categorySlug: 'measurement-tools',
    sellerEmail: 'seller2@circulink.dev'
  },
  {
    title: 'Breadboard Starter Kit',
    description: 'Includes jumper wires and resistor pack.',
    price: 45.00,
    condition: Condition.LIKE_NEW,
    status: ItemStatus.ACTIVE,
    images: ['https://via.placeholder.com/300?text=Breadboard'],
    categorySlug: 'kits-bundles',
    sellerEmail: 'seller@circulink.dev'
  },
  {
    title: 'Assorted Resistor Pack',
    description: '1/4W with common values, labeled bags.',
    price: 26.00,
    condition: Condition.GOOD,
    status: ItemStatus.ACTIVE,
    images: ['https://via.placeholder.com/300?text=Resistors'],
    categorySlug: 'components',
    sellerEmail: 'seller2@circulink.dev'
  },
  {
    title: '128x64 OLED Display',
    description: 'I2C OLED display, tested and working.',
    price: 36.00,
    condition: Condition.GOOD,
    status: ItemStatus.ACTIVE,
    images: ['https://via.placeholder.com/300?text=OLED+Display'],
    categorySlug: 'displays',
    sellerEmail: 'seller@circulink.dev'
  },
  {
    title: 'Li-ion Battery Pack (2x 18650)',
    description: 'Includes holder and JST connector.',
    price: 52.00,
    condition: Condition.GOOD,
    status: ItemStatus.ACTIVE,
    images: ['https://via.placeholder.com/300?text=Battery+Pack'],
    categorySlug: 'power-batteries',
    sellerEmail: 'seller2@circulink.dev'
  }
];

async function upsertCategories() {
  return Promise.all(
    categories.map((category) =>
      prisma.category.upsert({
        where: { slug: category.slug },
        update: { name: category.name },
        create: category
      })
    )
  );
}

async function upsertUsers() {
  return Promise.all(
    users.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          role: user.role,
          passwordHash: user.passwordHash,
          profile: {
            upsert: {
              update: user.profile,
              create: user.profile
            }
          }
        },
        create: {
          email: user.email,
          passwordHash: user.passwordHash,
          name: user.name,
          role: user.role,
          profile: { create: user.profile }
        }
      })
    )
  );
}

async function main() {
  const categoryRecords = await upsertCategories();
  const userRecords = await upsertUsers();

  const userByEmail = Object.fromEntries(userRecords.map((user) => [user.email, user]));
  const categoryBySlug = Object.fromEntries(categoryRecords.map((category) => [category.slug, category]));

  const seededItemTitles = sampleItems.map((entry) => entry.title);
  const seededSellerIds = userRecords.map((user) => user.id);
  const seededItems = await prisma.item.findMany({
    where: {
      sellerId: { in: seededSellerIds },
      title: { in: seededItemTitles }
    },
    select: { id: true }
  });
  const seededItemIds = seededItems.map((item) => item.id);

  if (seededItemIds.length > 0) {
    await prisma.$transaction([
      prisma.favorite.deleteMany({ where: { itemId: { in: seededItemIds } } }),
      prisma.message.deleteMany({ where: { thread: { itemId: { in: seededItemIds } } } }),
      prisma.messageThread.deleteMany({ where: { itemId: { in: seededItemIds } } }),
      prisma.order.deleteMany({ where: { itemId: { in: seededItemIds } } }),
      prisma.itemView.deleteMany({ where: { itemId: { in: seededItemIds } } }),
      prisma.itemStats.deleteMany({ where: { itemId: { in: seededItemIds } } }),
      prisma.item.deleteMany({ where: { id: { in: seededItemIds } } })
    ]);
  }

  const items = [];
  for (const entry of sampleItems) {
    const seller = userByEmail[entry.sellerEmail];
    const category = categoryBySlug[entry.categorySlug];
    if (!seller || !category) continue;

    const item = await prisma.item.create({
      data: {
        title: entry.title,
        description: entry.description,
        price: entry.price,
        condition: entry.condition,
        status: entry.status,
        images: JSON.stringify(entry.images),
        sellerId: seller.id,
        categoryId: category.id
      }
    });
    items.push(item);
  }

  const buyer = userByEmail['buyer@circulink.dev'];
  const buyer2 = userByEmail['buyer2@circulink.dev'];
  const seller = userByEmail['seller@circulink.dev'];

  if (buyer && buyer2 && items.length > 0) {
    await prisma.favorite.createMany({
      data: [
        { userId: buyer.id, itemId: items[0].id },
        { userId: buyer.id, itemId: items[1].id },
        { userId: buyer2.id, itemId: items[2].id }
      ],
      skipDuplicates: true
    });
  }

  if (buyer && seller && items.length > 0) {
    const thread = await prisma.messageThread.upsert({
      where: { itemId_buyerId_sellerId: { itemId: items[0].id, buyerId: buyer.id, sellerId: seller.id } },
      update: {},
      create: { itemId: items[0].id, buyerId: buyer.id, sellerId: seller.id }
    });

    await prisma.message.createMany({
      data: [
        { threadId: thread.id, senderId: buyer.id, body: 'Hi! Is this still available?' },
        { threadId: thread.id, senderId: seller.id, body: 'Yes, still available. Want to meet on campus?' }
      ]
    });

    const order = await prisma.order.create({
      data: {
        itemId: items[0].id,
        buyerId: buyer.id,
        sellerId: seller.id,
        status: OrderStatus.ACCEPTED,
        total: 158.0
      }
    });

    await prisma.order.create({
      data: {
        itemId: items[1].id,
        buyerId: buyer2.id,
        sellerId: seller.id,
        status: OrderStatus.PENDING,
        total: 299.0
      }
    });

    await prisma.itemView.createMany({
      data: [
        { itemId: items[0].id, viewerId: buyer.id },
        { itemId: items[0].id, viewerId: buyer2.id },
        { itemId: items[0].id },
        { itemId: items[1].id, viewerId: buyer.id },
        { itemId: items[2].id }
      ]
    });

    await prisma.itemStats.createMany({
      data: [
        { itemId: items[0].id, viewCount: 3, lastViewedAt: new Date() },
        { itemId: items[1].id, viewCount: 1, lastViewedAt: new Date() },
        { itemId: items[2].id, viewCount: 1, lastViewedAt: new Date() }
      ],
      skipDuplicates: true
    });

    void order;
  }
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
