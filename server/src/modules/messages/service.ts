import { prisma } from "../../lib/prisma.js";
import { ForbiddenError, NotFoundError } from "../../utils/errors.js";
import { normalizePagination } from "../../utils/pagination.js";
import { withParsedImages } from "../../utils/images.js";
import { DONATION_DESCRIPTION_PREFIX, isDonationDescription } from "../donations/utils.js";

export const listThreads = async (userId: string, itemId?: string, page?: number, pageSize?: number) => {
  const { skip, take, page: currentPage, pageSize: currentSize } = normalizePagination({ page, pageSize });
  const where = {
    OR: [{ buyerId: userId }, { sellerId: userId }],
    ...(itemId ? { itemId } : {}),
    item: {
      NOT: {
        description: { startsWith: DONATION_DESCRIPTION_PREFIX }
      }
    }
  };

  const threads = await prisma.messageThread.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take,
    include: {
      item: { select: { id: true, title: true, price: true, images: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 }
    }
  });

  const enriched = await Promise.all(
    threads.map(async (thread) => {
      const unread = await prisma.message.count({
        where: { threadId: thread.id, isRead: false, NOT: { senderId: userId } }
      });
      return {
        ...thread,
        item: withParsedImages(thread.item),
        unreadCount: unread,
        lastMessage: thread.messages[0] ?? null
      };
    })
  );

  const total = await prisma.messageThread.count({ where });
  return { threads: enriched, total, page: currentPage, pageSize: currentSize };
};

export const listMessages = async (userId: string, threadId: string, page?: number, pageSize?: number) => {
  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    include: { item: { select: { description: true } } }
  });
  if (!thread) throw new NotFoundError("Thread not found");
  if (isDonationDescription(thread.item.description)) throw new NotFoundError("Thread not found");
  if (thread.buyerId !== userId && thread.sellerId !== userId) throw new ForbiddenError();

  const { skip, take, page: currentPage, pageSize: currentSize } = normalizePagination({ page, pageSize });
  const messages = await prisma.message.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    skip,
    take
  });
  const total = await prisma.message.count({ where: { threadId } });
  return { messages, total, page: currentPage, pageSize: currentSize };
};

export const sendMessage = async (
  userId: string,
  payload: { threadId?: string; itemId?: string; recipientId?: string; body: string }
) => {
  if (payload.threadId) {
    const thread = await prisma.messageThread.findUnique({ where: { id: payload.threadId } });
    if (!thread) throw new NotFoundError("Thread not found");
    if (thread.buyerId !== userId && thread.sellerId !== userId) throw new ForbiddenError();
    return prisma.message.create({ data: { threadId: thread.id, senderId: userId, body: payload.body } });
  }

  if (!payload.itemId) throw new NotFoundError("Item is required for new thread");
  const item = await prisma.item.findUnique({ where: { id: payload.itemId } });
  if (!item) throw new NotFoundError("Item not found");
  if (isDonationDescription(item.description)) throw new NotFoundError("Item not found");

  const sellerId = item.sellerId;
  // Only a buyer may start a new conversation about an item (they become the
  // buyer party). A seller cannot cold-message an arbitrary user — they reply
  // within an existing thread instead. This closes an unsolicited-message vector.
  if (userId === sellerId) {
    throw new ForbiddenError("The seller can only reply within an existing conversation");
  }
  const buyerId = userId;

  const thread = await prisma.messageThread.upsert({
    where: { itemId_buyerId_sellerId: { itemId: item.id, buyerId, sellerId } },
    update: {},
    create: { itemId: item.id, buyerId, sellerId }
  });

  return prisma.message.create({ data: { threadId: thread.id, senderId: userId, body: payload.body } });
};

export const markMessageRead = async (userId: string, messageId: string) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { thread: { include: { item: { select: { description: true } } } } }
  });
  if (!message) throw new NotFoundError("Message not found");
  if (isDonationDescription(message.thread.item.description)) throw new NotFoundError("Message not found");
  if (message.senderId === userId) throw new ForbiddenError("Cannot mark own message as read");
  if (message.thread.buyerId !== userId && message.thread.sellerId !== userId) throw new ForbiddenError();

  if (message.isRead) return message;
  return prisma.message.update({ where: { id: messageId }, data: { isRead: true } });
};
