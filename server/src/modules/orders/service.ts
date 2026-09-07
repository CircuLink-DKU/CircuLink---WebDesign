import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../../utils/errors.js";
import { normalizePagination } from "../../utils/pagination.js";
import { withParsedImages } from "../../utils/images.js";
import { isDonationDescription } from "../donations/utils.js";

// Define OrderStatus as string constants since SQLite doesn't support enums
type OrderStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELLED";

const allowedTransitions: Record<OrderStatus, { buyer: OrderStatus[]; seller: OrderStatus[] }> = {
  PENDING: { buyer: ["CANCELLED"], seller: ["ACCEPTED", "REJECTED"] },
  ACCEPTED: { buyer: ["PAID", "CANCELLED"], seller: [] },
  REJECTED: { buyer: [], seller: [] },
  PAID: { buyer: ["CANCELLED"], seller: ["SHIPPED"] },
  SHIPPED: { buyer: ["COMPLETED"], seller: [] },
  COMPLETED: { buyer: [], seller: [] },
  CANCELLED: { buyer: [], seller: [] }
};

const getRole = (order: { buyerId: string; sellerId: string }, userId: string) => {
  if (order.buyerId === userId) return "buyer" as const;
  if (order.sellerId === userId) return "seller" as const;
  throw new ForbiddenError();
};

// Statuses that mean an order is still "occupying" the item (not cancelled/rejected).
const OPEN_ORDER_STATUSES: OrderStatus[] = ["PENDING", "ACCEPTED", "PAID", "SHIPPED", "COMPLETED"];

export const createOrder = async (buyerId: string, data: { itemId: string }) => {
  // Run inside a transaction so the "item is available + no open order exists"
  // check and the order creation are atomic (prevents double-ordering / overselling).
  return prisma.$transaction(async (tx) => {
    const item = await tx.item.findUnique({ where: { id: data.itemId } });
    if (!item) throw new NotFoundError("Item not found");
    if (isDonationDescription(item.description)) throw new ForbiddenError("Donation item is not for sale");
    if (item.sellerId === buyerId) throw new ForbiddenError("Cannot order own item");
    if (item.status !== "ACTIVE") throw new ForbiddenError("Item not available");

    const openOrder = await tx.order.findFirst({
      where: { itemId: item.id, status: { in: OPEN_ORDER_STATUSES } },
      select: { id: true }
    });
    if (openOrder) throw new ConflictError("This item already has an active order");

    // Amount is always derived from the item price — never trusted from the client.
    return tx.order.create({
      data: {
        itemId: item.id,
        buyerId,
        sellerId: item.sellerId,
        status: "PENDING",
        total: Number(item.price)
      }
    });
  });
};

export const listOrders = async (
  userId: string,
  params: { role?: "buyer" | "seller"; status?: OrderStatus; page?: number; pageSize?: number }
) => {
  const { skip, take, page, pageSize } = normalizePagination(params);
  const where: Prisma.OrderWhereInput = {
    OR:
      params.role === "buyer"
        ? [{ buyerId: userId }]
        : params.role === "seller"
          ? [{ sellerId: userId }]
          : [{ buyerId: userId }, { sellerId: userId }],
    ...(params.status ? { status: params.status } : {})
  };

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        item: { select: { id: true, title: true, price: true, images: true } },
        buyer: { select: { id: true, email: true, name: true } },
        seller: { select: { id: true, email: true, name: true } }
      }
    }),
    prisma.order.count({ where })
  ]);

  return {
    orders: orders.map((order) => ({
      ...order,
      item: withParsedImages(order.item)
    })),
    total,
    page,
    pageSize
  };
};

export const updateOrderStatus = async (userId: string, orderId: string, nextStatus: OrderStatus) => {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError("Order not found");

    const role = getRole(order, userId);
    const allowed = allowedTransitions[order.status as OrderStatus][role];
    if (!allowed.includes(nextStatus)) {
      throw new ForbiddenError(`Cannot change status from ${order.status} to ${nextStatus} as ${role}`);
    }

    const updated = await tx.order.update({ where: { id: orderId }, data: { status: nextStatus } });

    // Keep item inventory consistent with the order lifecycle: a completed order
    // marks the item SOLD so it can no longer be listed or ordered again.
    if (nextStatus === "COMPLETED") {
      await tx.item.update({ where: { id: order.itemId }, data: { status: "SOLD" } });
    }

    return updated;
  });
};

export const getOrderById = async (userId: string, orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      item: { select: { id: true, title: true, price: true, images: true } },
      buyer: { select: { id: true, email: true, name: true } },
      seller: { select: { id: true, email: true, name: true } }
    }
  });

  if (!order) throw new NotFoundError("Order not found");
  if (order.buyerId !== userId && order.sellerId !== userId) throw new ForbiddenError();

  return {
    ...order,
    item: withParsedImages(order.item)
  };
};
