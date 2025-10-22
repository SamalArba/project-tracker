import express, { Request, Response } from "express";
import cors from "cors";
import { PrismaClient, ListKind } from "@prisma/client";
import { z } from "zod";

const app = express();
app.use(cors());
app.use(express.json());

// --- health
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "server", ts: new Date().toISOString() });
});

// --- prisma
const prisma = new PrismaClient();

// helper: parse ?list=... with default
const listParam = z.nativeEnum(ListKind).catch(ListKind.NEGOTIATION);

// GET /api/projects?list=NEGOTIATION|ARCHIVE|SIGNED&search=...
app.get("/api/projects", async (req: Request, res: Response) => {
  const list = listParam.parse(req.query.list);
  const q = (req.query.search as string | undefined)?.trim();

  // Build 'where' only with defined pieces (avoids TS/Prisma type issues)
  const where: any = { listKind: list };
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { developer: { contains: q } },
    ];
  }

  const items = await prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  res.json(items);
});

// GET /api/projects/:id
app.get("/api/projects/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return res.sendStatus(404);
  res.json(project);
});

// POST /api/projects  (simple create while UI is coming)
const createProjectSchema = z.object({
  name: z.string().min(1),
  developer: z.string().optional(),
  listKind: z.nativeEnum(ListKind).optional(),
  standard: z.string().optional(),
  units: z.number().int().optional(),
  scopeValue: z.string().optional(),
  startDate: z.string().datetime().optional(),
  execution: z.number().int().min(0).max(100).optional(),
  remaining: z.string().optional(),
});
app.post("/api/projects", async (req: Request, res: Response) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const created = await prisma.project.create({ data: parsed.data as any });
  res.status(201).json(created);
});

// --- start
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
