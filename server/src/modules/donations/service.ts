import { Donation, Category, User } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { normalizePagination } from "../../utils/pagination.js";
import { NotFoundError } from "../../utils/errors.js";
import { serializeImages, withParsedImages } from "../../utils/images.js";
import { assessDonationSubmission } from "../reviews/rules.js";

type DonationListInput = {
  q?: string;
  categoryId?: string;
  sellerId?: string;
  donorId?: string;
  status?: string;
  reviewStatus?: string;
  page?: number;
  pageSize?: number;
};

type CreateDonationInput = {
  description: string;
  categoryId: string;
  images: string[];
};

type DonationWithRelations = Donation & {
  category: Category;
  donor: Pick<User, "id" | "email" | "name">;
};

const toDonationTitle = (description: string) => {
  const trimmed = description.trim();
  return `Donation: ${trimmed.substring(0, 50)}${trimmed.length > 50 ? "..." : ""}`;
};

const toCompatibleDonation = (donation: DonationWithRelations) => {
  const parsed = withParsedImages(donation);
  return {
    id: parsed.id,
    title: toDonationTitle(parsed.description),
    description: parsed.description,
    price: 0,
    condition: "GOOD",
    status: parsed.status,
    reviewStatus: parsed.reviewStatus,
    categoryId: parsed.categoryId,
    sellerId: parsed.donorId,
    donorId: parsed.donorId,
    images: parsed.images,
    category: parsed.category,
    seller: parsed.donor,
    donor: parsed.donor,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt
  };
};

export const listDonations = async (filters: DonationListInput) => {
  const { page, pageSize, skip, take } = normalizePagination(filters);
  const where = {
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.donorId || filters.sellerId ? { donorId: filters.donorId ?? filters.sellerId } : {}),
    ...(filters.status ? { status: filters.status } : { status: "ACTIVE" }),
    ...(filters.reviewStatus ? { reviewStatus: filters.reviewStatus } : { reviewStatus: "APPROVED" }),
    ...(filters.q ? { description: { contains: filters.q } } : {})
  };

  const [donations, total] = await prisma.$transaction([
    prisma.donation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        category: true,
        donor: { select: { id: true, email: true, name: true } }
      }
    }),
    prisma.donation.count({ where })
  ]);

  return {
    items: donations.map(toCompatibleDonation),
    total,
    page,
    pageSize
  };
};

export const getDonationById = async (id: string) => {
  const donation = await prisma.donation.findUnique({
    where: { id },
    include: {
      category: true,
      donor: { select: { id: true, email: true, name: true } }
    }
  });

  if (!donation) {
    throw new NotFoundError("Donation not found");
  }

  return toCompatibleDonation(donation);
};

export const createDonation = async (donorId: string, data: CreateDonationInput) => {
  const description = data.description.trim();
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
    select: { id: true, name: true, slug: true }
  });
  if (!category) throw new NotFoundError("Category not found");

  const assessment = assessDonationSubmission({
    description,
    images: data.images,
    category
  });
  const status = assessment.shouldReview ? "PENDING_REVIEW" : "ACTIVE";
  const reviewStatus = assessment.shouldReview ? "PENDING_REVIEW" : "APPROVED";

  const donation = await prisma.$transaction(async (tx) => {
    const created = await tx.donation.create({
      data: {
        description,
        status,
        reviewStatus,
        categoryId: data.categoryId,
        images: serializeImages(data.images),
        donorId
      },
      include: {
        category: true,
        donor: { select: { id: true, email: true, name: true } }
      }
    });

    if (assessment.shouldReview) {
      await tx.reviewQueue.create({
        data: {
          targetType: "DONATION",
          targetId: created.id,
          submissionType: "NEW_DONATION",
          submittedById: donorId,
          status: "PENDING",
          riskLevel: assessment.riskLevel,
          flags: JSON.stringify(assessment.flags),
          summary: assessment.summary
        }
      });
    }

    return created;
  });

  return toCompatibleDonation(donation);
};
