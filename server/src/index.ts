import express, { Request, Response } from "express";
import cors from "cors";
import { PrismaClient, ListKind, ProjectStatus } from "@prisma/client";
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

// ===== GET /api/projects?list=NEGOTIATION|ARCHIVE|SIGNED&search=... =====
// Returns rows shaped for the tables, including last assignment info.
app.get("/api/projects", async (req: Request, res: Response) => {
  try {
    const list = listParam.parse(req.query.list);
    const q = (req.query.search as string | undefined)?.trim();

    const where: any = { listKind: list };
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { developer: { contains: q } },
        { scopeValue: { contains: q } },
      ];
    }

    const items = await prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        assignments: {
          orderBy: { createdAt: "desc" },
          take: 1, // last assignment
        },
      },
    });

    const shaped = items.map((p) => {
      const last = p.assignments[0];
      return {
        id: p.id,
        name: p.name,
        developer: p.developer ?? null,
        status: p.status,                   // ProjectStatus enum
        scopeValue: p.scopeValue ?? null,
        lastTaskTitle: last?.title ?? null, // משימה אחרונה
        lastHandlerName: last?.assigneeName ?? null, // שם המטפל
        lastTaskDate: last?.createdAt ?? null,       // תאריך
        createdAt: p.createdAt,
      };
    });

    res.json(shaped);
  } catch (err: any) {
    console.error("GET /api/projects error:", err?.issues ?? err, "req.query:", req.query);
    res.status(500).json({ error: "failed_to_list_projects" });
  }
});

// ===== GET /api/projects/:id =====
app.get("/api/projects/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });

  const project = await prisma.project.findUnique({
    where: { id },
    include: { assignments: { orderBy: { createdAt: "desc" } } },
  });
  if (!project) return res.sendStatus(404);
  res.json(project);
});

// ===== PATCH /api/projects/:id =====
const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  developer: z.string().nullable().optional(),
  listKind: z.nativeEnum(ListKind).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  standard: z.string().nullable().optional(),
  units: z.coerce.number().int().nonnegative().nullable().optional(),
  scopeValue: z.string().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  execution: z.coerce.number().int().min(0).max(100).nullable().optional(),
  remaining: z.string().nullable().optional(),
});

app.patch("/api/projects/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });

  try {
    const data = updateProjectSchema.parse(req.body);

    // convert nulls to undefined so Prisma “unsets” properly
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      clean[k] = v === null ? undefined : v;
    }

    const updated = await prisma.project.update({
      where: { id },
      data: clean,
    });

    res.json(updated);
  } catch (err: any) {
    console.error("PATCH project error:", err?.issues ?? err);
    res.status(400).json({ error: err?.issues ?? "Bad request" });
  }
});

// ===== POST /api/projects/:id/assignments =====
const createAssignmentSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  assigneeName: z.string().optional(),
  dueDate: z.coerce.date().optional().nullable(),
});
app.post("/api/projects/:id/assignments", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });

  try {
    const data = createAssignmentSchema.parse(req.body);
    const created = await prisma.assignment.create({
      data: {
        projectId: id,
        title: data.title,
        notes: data.notes,
        assigneeName: data.assigneeName?.trim() || undefined,
        dueDate: data.dueDate ?? undefined,
      },
    });
    res.status(201).json(created);
  } catch (err: any) {
    console.error("Create assignment error:", err?.issues ?? err);
    res.status(400).json({ error: err?.issues ?? "Bad request" });
  }
});

// ===== DELETE /api/projects/:id =====
// (If your FK doesn’t cascade, we remove assignments first.)
app.delete("/api/projects/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.assignment.deleteMany({ where: { projectId: id } });
      await tx.project.delete({ where: { id } });
    });
    res.sendStatus(204);
  } catch (err: any) {
    console.error("Delete project error:", err);
    res.status(400).json({ error: "cannot_delete_project" });
  }
});

// ===== POST /api/projects =====
// Adds optional initial assignment (title + assigneeName). Coerces numbers/dates.
const zDateOpt = z.coerce.date().optional();

const createProjectSchema = z.object({
  name: z.string().min(1),
  developer: z.string().optional(),
  listKind: z.nativeEnum(ListKind).optional().default(ListKind.NEGOTIATION),
  status: z.nativeEnum(ProjectStatus).optional().default(ProjectStatus.ACTIVE),
  standard: z.string().optional(),
  units: z.coerce.number().int().nonnegative().optional(),
  scopeValue: z.string().optional(),
  startDate: zDateOpt, // accepts 'YYYY-MM-DD' or ISO string
  execution: z.coerce.number().int().min(0).max(100).optional(),
  remaining: z.string().optional(),

  initialAssignment: z.object({
    title: z.string().min(1),
    notes: z.string().optional(),
    assigneeName: z.string().optional(), // free-text name only
    dueDate: zDateOpt.optional(),
  }).optional(),
});

app.post("/api/projects", async (req: Request, res: Response) => {
  try {
    const data = createProjectSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: data.name,
          developer: data.developer,
          listKind: data.listKind,
          status: data.status,
          standard: data.standard,
          units: data.units,
          scopeValue: data.scopeValue,
          startDate: data.startDate ?? undefined,
          execution: data.execution,
          remaining: data.remaining,
        },
      });

      let createdAssignment: unknown = null;
      if (data.initialAssignment) {
        const { title, notes, assigneeName, dueDate } = data.initialAssignment;
        createdAssignment = await tx.assignment.create({
          data: {
            projectId: project.id,
            title,
            notes,
            assigneeName: assigneeName?.trim() || undefined,
            dueDate: dueDate ?? undefined,
          },
        });
      }

      return { project, initialAssignment: createdAssignment };
    });

    res.status(201).json(result);
  } catch (err: any) {
    console.error("Create project error:", err?.issues ?? err);
    res.status(400).json({ error: err?.issues ?? "Bad request" });
  }
});

// --- start
const PORT = Number(process.env.PORT) || 4000;
async function main() {
  try {
    console.log("[server] booting…");
    await prisma.$connect();
    console.log("[server] prisma connected");
    app.listen(PORT, () => {
      console.log(`[server] listening at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("[server] FATAL during boot:", err);
    process.exit(1);
  }
}
main();
