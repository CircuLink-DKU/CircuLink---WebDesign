import { Request, Response } from "express";
import { decideReview, getReviewById, listReviews } from "./service.js";

export const listReviewsController = async (req: Request, res: Response) => {
  const { reviews, total, page, pageSize } = await listReviews(req.user!, {
    status: req.query.status as "PENDING" | "APPROVED" | "REJECTED" | undefined,
    targetType: req.query.targetType as "ITEM" | "DONATION" | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined
  });
  res.json({ data: reviews, meta: { page, pageSize, total } });
};

export const getReviewController = async (req: Request, res: Response) => {
  const review = await getReviewById(req.user!, String(req.params.id));
  res.json({ data: review });
};

export const approveReviewController = async (req: Request, res: Response) => {
  const review = await decideReview(req.user!, String(req.params.id), "APPROVE", req.body);
  res.json({ data: review });
};

export const rejectReviewController = async (req: Request, res: Response) => {
  const review = await decideReview(req.user!, String(req.params.id), "REJECT", req.body);
  res.json({ data: review });
};

export const requestChangesReviewController = async (req: Request, res: Response) => {
  const review = await decideReview(req.user!, String(req.params.id), "REQUEST_CHANGES", req.body);
  res.json({ data: review });
};

export const hideReviewController = async (req: Request, res: Response) => {
  const review = await decideReview(req.user!, String(req.params.id), "HIDE", req.body);
  res.json({ data: review });
};
