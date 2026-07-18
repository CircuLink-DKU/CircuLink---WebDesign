import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { normalizePagination } from "../../utils/pagination.js";
import { ForbiddenError, NotFoundError } from "../../utils/errors.js";
import { serializeImages, withParsedImages } from "../../utils/images.js";
import { DONATION_DESCRIPTION_PREFIX, isDonationDescription } from "../donations/utils.js";
import { assessListingSubmission } from "../reviews/rules.js";

// Define types as string constants since SQLite doesn't support enums
type Condition = "NEW" | "LIKE_NEW" | "GOOD" | "FAIR";
type ItemStatus = "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "REJECTED" | "SOLD" | "ARCHIVED" | "HIDDEN";

export type ListItemsInput = {
  categoryId?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: Condition;
  status?: ItemStatus;
  sellerId?: string;
  sort?: "price" | "createdAt";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  includeDonations?: boolean;
};

export const listItems = async (filters: ListItemsInput) => {
  const { page, pageSize, skip, take } = normalizePagination(filters);
  const where: Prisma.ItemWhereInput = {
    ...(filters.includeDonations ? {} : { NOT: { description: { startsWith: DONATION_DESCRIPTION_PREFIX } } })
  };

  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.sellerId) where.sellerId = filters.sellerId;
  if (filters.condition) where.condition = filters.condition;
  where.status = filters.status ?? "ACTIVE";
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q } },
      { description: { contains: filters.q } }
    ];
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {
      ...(filters.minPrice !== undefined && { gte: filters.minPrice }),
      ...(filters.maxPrice !== undefined && { lte: filters.maxPrice })
    };
  }

  const orderBy: Prisma.ItemOrderByWithRelationInput = filters.sort 
    ? (filters.sort === "price" 
        ? { price: filters.order ?? "desc" } 
        : { createdAt: filters.order ?? "desc" })
    : { createdAt: "desc" };

  const [items, total] = await prisma.$transaction([
    prisma.item.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        category: true,
        seller: { select: { id: true, email: true, name: true } }
      }
    }),
    prisma.item.count({ where })
  ]);

  return { items: items.map(withParsedImages), total, page, pageSize };
};

export const getItemById = async (id: string) => {
  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      category: true,
      seller: { select: { id: true, email: true, name: true } }
    }
  });
  if (!item) throw new NotFoundError("Item not found");
  if (isDonationDescription(item.description)) throw new NotFoundError("Item not found");
  return withParsedImages(item);
};

export type CreateItemInput = {
  title: string;
  description: string;
  price: number;
  condition: Condition;
  status: ItemStatus;
  categoryId: string;
  images: string[];
};

export const createItem = async (sellerId: string, data: CreateItemInput) => {
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
    select: { id: true, name: true, slug: true }
  });
  if (!category) throw new NotFoundError("Category not found");

  const assessment = assessListingSubmission({
    title: data.title,
    description: data.description,
    price: data.price,
    images: data.images,
    category
  });
  const status = assessment.shouldReview ? "PENDING_REVIEW" : data.status;

  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.item.create({
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        condition: data.condition,
        status,
        categoryId: data.categoryId,
        images: serializeImages(data.images),
        sellerId
      }
    });

    if (assessment.shouldReview) {
      await tx.reviewQueue.create({
        data: {
          targetType: "ITEM",
          targetId: created.id,
          submissionType: "NEW_LISTING",
          submittedById: sellerId,
          status: "PENDING",
          riskLevel: assessment.riskLevel,
          flags: JSON.stringify(assessment.flags),
          summary: assessment.summary
        }
      });
    }

    return created;
  });

  return withParsedImages(item);
};

export const updateItem = async (id: string, userId: string, data: Partial<CreateItemInput>) => {
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) throw new NotFoundError("Item not found");
  if (item.sellerId !== userId) throw new ForbiddenError("Only the seller can update this item");

  const updateData: Prisma.ItemUpdateInput = {
    ...(data.title && { title: data.title }),
    ...(data.description && { description: data.description }),
    ...(data.price !== undefined && { price: data.price }),
    ...(data.condition && { condition: data.condition }),
    ...(data.status && { status: data.status }),
    ...(data.categoryId && { categoryId: data.categoryId }),
    ...(data.images && { images: serializeImages(data.images) })
  };

  const updated = await prisma.item.update({
    where: { id },
    data: updateData
  });
  return withParsedImages(updated);
};

export const deleteItem = async (id: string, userId: string) => {
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) throw new NotFoundError("Item not found");
  if (item.sellerId !== userId) throw new ForbiddenError("Only the seller can delete this item");
  await prisma.$transaction([
    prisma.favorite.deleteMany({ where: { itemId: id } }),
    prisma.message.deleteMany({ where: { thread: { itemId: id } } }),
    prisma.messageThread.deleteMany({ where: { itemId: id } }),
    prisma.order.deleteMany({ where: { itemId: id } }),
    prisma.itemView.deleteMany({ where: { itemId: id } }),
    prisma.itemStats.deleteMany({ where: { itemId: id } }),
    prisma.item.delete({ where: { id } })
  ]);
};
