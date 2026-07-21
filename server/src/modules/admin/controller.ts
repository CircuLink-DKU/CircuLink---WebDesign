import { Request, Response } from "express";
import { UserRole } from "../../middleware/auth.js";
import { listAdminUsers, updateAdminUserRole } from "./service.js";

export const listAdminUsersController = async (req: Request, res: Response) => {
  const { users, total, page, pageSize } = await listAdminUsers({
    q: req.query.q as string | undefined,
    role: req.query.role as UserRole | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined
  });
  res.json({ data: users, meta: { page, pageSize, total } });
};

export const updateAdminUserRoleController = async (req: Request, res: Response) => {
  const user = await updateAdminUserRole(req.user!.id, req.params.id as string, req.body.role);
  res.json({ data: user });
};
