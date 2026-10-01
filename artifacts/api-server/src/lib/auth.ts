import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const JWT_SECRET: string = process.env.JWT_SECRET ?? (() => { throw new Error("JWT_SECRET environment variable is required") })();

export interface JwtPayload {
  userId: number;
  phone: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token taqdim etilmagan" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Noto'g'ri yoki muddati o'tgan token" });
  }
}

// Faqat admin uchun — authMiddleware'dan keyin ishlaydi.
// Users jadvalidan joriy rolni tekshiradi (token'dagi rol ishonchsiz bo'lishi mumkin).
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = (req as any).user?.userId;
  if (!userId) {
    res.status(401).json({ error: "Token taqdim etilmagan" });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "Bu amal faqat admin uchun" });
      return;
    }
    next();
  } catch (err) {
    console.error("[auth] requireAdmin xatosi:", err);
    res.status(500).json({ error: "Server xatosi" });
  }
}
