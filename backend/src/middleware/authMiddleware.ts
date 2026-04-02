import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

function jwtSecret(): string {
  const s = process.env.JWT_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }
  return "studysync-dev-secret-change-me";
}

export function signUserToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email }, jwtSecret(), { expiresIn: "7d" });
}

export function verifyUserToken(token: string): { sub: string; email: string } {
  return jwt.verify(token, jwtSecret()) as { sub: string; email: string };
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const auth = req.get("authorization")?.trim();
  if (!auth?.toLowerCase().startsWith("bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }
  const token = auth.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: "Missing token" });
    return;
  }
  try {
    const { sub, email } = verifyUserToken(token);
    req.userId = sub;
    req.userEmail = email;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

declare global {
  namespace Express {
    interface Request {
      userEmail?: string;
    }
  }
}
