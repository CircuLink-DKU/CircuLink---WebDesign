import { Request, Response } from "express";
import { createDonation, getDonationById, listDonations } from "./service.js";

export const createDonationController = async (req: Request, res: Response) => {
  const donation = await createDonation(req.user!.id, req.body);
  res.status(201).json({ data: donation });
};

export const listDonationsController = async (req: Request, res: Response) => {
  const { items, total, page, pageSize } = await listDonations({
    q: req.query.q as string | undefined,
    categoryId: req.query.categoryId as string | undefined,
    sellerId: req.query.sellerId as string | undefined,
    donorId: req.query.donorId as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined
  });

  res.json({ data: items, meta: { page, pageSize, total } });
};

export const getDonationController = async (req: Request, res: Response) => {
  const donation = await getDonationById(String(req.params.id));
  res.json({ data: donation });
};
