import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { ForbiddenError, NotFoundError } from "../../utils/errors.js";
import { normalizePagination } from "../../utils/pagination.js";
import { hasRole, AuthUser } from "../../middleware/auth.js";
import { CreateReviewInput } from "./rules.js";

type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_CHANGES" | "HIDDEN";
type ReviewTargetType = "ITEM" | "DONATION";
type ReviewDecision = "APPROVE" | "REJECT" | "REQUEST_CHANGES" | "HIDE";

export const createReviewQueueEntry = async (input: CreateReviewInput) => {
  return prisma.reviewQueue.create({
    data: {
      targetType: input.targetType,
      targetId: input.targetId,
      submissionType: input.submissionType,
      submittedById: input.submittedById,
      status: "PENDING",
      riskLevel: input.assessment.riskLevel,
      flags: JSON.stringify(input.assessment.flags),
      summary: input.assessment.summary
    }
  });
};

const parseFlags = <T extends { flags: string }>(review: T) => {
  try {
    const parsed = JSON.parse(review.flags);
    return { ...review, flags: Array.isArray(parsed) ? parsed : [] };
  } catch {
    return { ...review, flags: [] };
  }
};

const assertCanReviewTarget = (user: AuthUser, targetType: string) => {
  if (hasRole(user, "ADMIN")) return;
  if (targetType === "DONATION" && hasRole(user, "CLUB_OPERATOR")) return;
  throw new ForbiddenError("Review access required");
};

export const listReviews = async (
  user: AuthUser,
  filters: {
    status?: ReviewStatus;
    targetType?: ReviewTargetType;
    page?: number;
    pageSize?: number;
  }
) => {
  const { page, pageSize, skip, take } = normalizePagination(filters);
  const where: Prisma.ReviewQueueWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.targetType ? { targetType: filters.targetType } : {}),
    ...(hasRole(user, "CLUB_OPERATOR") && !hasRole(user, "ADMIN") ? { targetType: "DONATION" } : {})
  };

  const [reviews, total] = await prisma.$transaction([
    prisma.reviewQueue.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        submittedBy: { select: { id: true, email: true, name: true, role: true } },
        assignedReviewer: { select: { id: true, email: true, name: true, role: true } },
        reviewedBy: { select: { id: true, email: true, name: true, role: true } },
        decisions: {
          orderBy: { createdAt: "desc" },
          include: { reviewer: { select: { id: true, email: true, name: true, role: true } } }
        }
      }
    }),
    prisma.reviewQueue.count({ where })
  ]);

  return { reviews: reviews.map(parseFlags), total, page, pageSize };
};

export const getReviewById = async (user: AuthUser, id: string) => {
  const review = await prisma.reviewQueue.findUnique({
    where: { id },
    include: {
      submittedBy: { select: { id: true, email: true, name: true, role: true } },
      assignedReviewer: { select: { id: true, email: true, name: true, role: true } },
      reviewedBy: { select: { id: true, email: true, name: true, role: true } },
      decisions: {
        orderBy: { createdAt: "desc" },
        include: { reviewer: { select: { id: true, email: true, name: true, role: true } } }
      }
    }
  });
  if (!review) throw new NotFoundError("Review not found");
  assertCanReviewTarget(user, review.targetType);
  return parseFlags(review);
};

export const decideReview = async (
  user: AuthUser,
  id: string,
  decision: ReviewDecision,
  input: { reasonCode?: string; comment?: string }
) => {
  const review = await prisma.reviewQueue.findUnique({ where: { id } });
  if (!review) throw new NotFoundError("Review not found");
  assertCanReviewTarget(user, review.targetType);
  if (review.status !== "PENDING") throw new ForbiddenError("Review has already been decided");

  const nextReviewStatus =
    decision === "APPROVE"
      ? "APPROVED"
      : decision === "REQUEST_CHANGES"
        ? "NEEDS_CHANGES"
        : decision === "HIDE"
          ? "HIDDEN"
          : "REJECTED";
  const nextTargetStatus =
    decision === "APPROVE"
      ? "ACTIVE"
      : decision === "HIDE"
        ? "HIDDEN"
        : "REJECTED";

  return prisma.$transaction(async (tx) => {
    if (review.targetType === "ITEM") {
      await tx.item.update({
        where: { id: review.targetId },
        data: { status: nextTargetStatus }
      });
    } else if (review.targetType === "DONATION") {
      await tx.donation.update({
        where: { id: review.targetId },
        data: {
          status: nextTargetStatus,
          reviewStatus: nextReviewStatus
        }
      });
    }

    await tx.reviewQueue.update({
      where: { id },
      data: {
        status: nextReviewStatus,
        reviewedById: user.id,
        reviewedAt: new Date()
      }
    });

    await tx.reviewDecision.create({
      data: {
        reviewId: id,
        reviewerId: user.id,
        decision,
        reasonCode: input.reasonCode,
        comment: input.comment
      }
    });

    const updated = await tx.reviewQueue.findUniqueOrThrow({
      where: { id },
      include: {
        submittedBy: { select: { id: true, email: true, name: true, role: true } },
        assignedReviewer: { select: { id: true, email: true, name: true, role: true } },
        reviewedBy: { select: { id: true, email: true, name: true, role: true } },
        decisions: {
          orderBy: { createdAt: "desc" },
          include: { reviewer: { select: { id: true, email: true, name: true, role: true } } }
        }
      }
    });

    return parseFlags(updated);
  });
};
