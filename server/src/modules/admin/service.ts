import { Prisma } from "@prisma/client";
import { UserRole } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";
import { normalizePagination } from "../../utils/pagination.js";
import { BadRequestError, NotFoundError } from "../../utils/errors.js";

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  emailVerifiedAt: true,
  createdAt: true,
  updatedAt: true
};

export type ListAdminUsersInput = {
  q?: string;
  role?: UserRole;
  page?: number;
  pageSize?: number;
};

export const listAdminUsers = async (filters: ListAdminUsersInput) => {
  const { page, pageSize, skip, take } = normalizePagination(filters);
  const where: Prisma.UserWhereInput = {};

  if (filters.role) where.role = filters.role;
  if (filters.q) {
    where.OR = [
      { email: { contains: filters.q, mode: "insensitive" } },
      { name: { contains: filters.q, mode: "insensitive" } }
    ];
  }

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: [{ role: "asc" }, { email: "asc" }],
      skip,
      take,
      select: userSelect
    }),
    prisma.user.count({ where })
  ]);

  return { users, total, page, pageSize };
};

export const updateAdminUserRole = async (actorId: string, targetUserId: string, role: UserRole) => {
  if (actorId === targetUserId) {
    throw new BadRequestError("Admins cannot change their own role from this panel");
  }

  const existing = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true }
  });
  if (!existing) throw new NotFoundError("User not found");

  return prisma.user.update({
    where: { id: targetUserId },
    data: { role },
    select: userSelect
  });
};
