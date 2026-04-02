import type { Request, Response, NextFunction } from "express";

const HEADER = "x-user-id";

export function mockUserMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let userId = req.get(HEADER)?.trim();
  if (!userId) {
    res.status(401).json({ error: "Missing x-user-id header" });
    return;
  }
  req.userId = userId;
  next();
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}
