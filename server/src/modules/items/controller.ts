import { Request, Response } from "express";
import { createItem, deleteItem, getItemById, listItems, updateItem } from "./service.js";

export const listItemsController = async (req: Request, res: Response) => {
  type Condition = "NEW" | "LIKE_NEW" | "GOOD" | "FAIR";
  type ItemStatus = "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "REJECTED" | "SOLD" | "ARCHIVED" | "HIDDEN";
  type SortField = "price" | "createdAt";
  type SortOrder = "asc" | "desc";

  const { items, total, page, pageSize } = await listItems({
    categoryId: req.query.categoryId as string | undefined,
    q: req.query.q as string | undefined,
    minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
    maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
    condition: req.query.condition as Condition | undefined,
    status: req.query.status as ItemStatus | undefined,
    sellerId: req.query.sellerId as string | undefined,
    sort: req.query.sort as SortField | undefined,
    order: req.query.order as SortOrder | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined
  });
  res.json({ data: items, meta: { page, pageSize, total } });
};

export const getItemController = async (req: Request, res: Response) => {
  const item = await getItemById(String(req.params.id));
  res.json({ data: item });
};

export const createItemController = async (req: Request, res: Response) => {
  const item = await createItem(req.user!.id, req.body);
  res.status(201).json({ data: item });
};

export const updateItemController = async (req: Request, res: Response) => {
  const item = await updateItem(String(req.params.id), req.user!.id, req.body);
  res.json({ data: item });
};

export const deleteItemController = async (req: Request, res: Response) => {
  await deleteItem(String(req.params.id), req.user!.id);
  res.status(204).send();
};
