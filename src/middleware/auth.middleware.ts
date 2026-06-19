import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "@utils/jwt";
import { Admin } from "@models/index";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const header = req.headers["authorization"];
    if (!header)
      return res
        .status(401)
        .json({ success: false, message: "Missing Authorization header" });
    const parts = (header as string).split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer")
      return res
        .status(401)
        .json({ success: false, message: "Invalid Authorization header" });
    const token = parts[1];
    const payload = verifyAccessToken(token);
    const admin = await Admin.findByPk(payload.sub, {
      attributes: ["id", "email"],
    });
    if (!admin)
      return res.status(401).json({ success: false, message: "Invalid token" });
    (req as any).user = { id: admin.id, email: admin.email };
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
};

export default authMiddleware;
