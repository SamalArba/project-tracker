// server/index.ts
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


// GET /api/projects?list=NEGOTIATION|SIGNED|ARCHIVE&search=...&limit=200
app.get("/api/projects", async (req: Request, res: Response) => {
  try {
    const list = listParam.parse(req.query.list);
    const q = (req.query.search as string | undefined)?.trim();
    const limit = Math.min(500, Math.max(25, Number(req.query.limit) || 200)); // default 200, cap 500

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
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        assignments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    const shaped = items.map((p) => {
      const last = p.assignments[0];
      return {
        id: p.id,
        name: p.name,
        developer: p.developer ?? null,
        status: p.status,
        scopeValue: p.scopeValue ?? null,
        lastTaskTitle: last?.title ?? null,
        lastHandlerName: last?.assigneeName ?? null,
        lastTaskDate: last?.createdAt ?? null,
        createdAt: p.createdAt,
      };
    });

    res.json(shaped);
  } catch (err: any) {
    console.error("GET /api/projects error:", err);
    res.status(500).json({ error: "failed_to_list_projects" });
  }
});

// ===== GET /api/projects/:id =====
app.get("/api/projects/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        assignments: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!project) return res.sendStatus(404);

    const contacts = await prisma.contact.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });

    res.json({ ...project, contacts });
  } catch (err: any) {
    console.error(`GET /api/projects/${req.params.id} error:`, err);
    res.status(500).json({ error: "failed_to_load_project" });
  }
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

/* ======================
   Contacts (child of project)
   ====================== */
const createContactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
});

// GET /api/projects/:id/contacts
app.get("/api/projects/:id/contacts", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });

  try {
    const contacts = await prisma.contact.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });
    res.json(contacts);
  } catch (err: any) {
    console.error(`GET /api/projects/${req.params.id}/contacts error:`, err);
    res.status(500).json({ error: "failed_to_list_contacts" });
  }
});

// POST /api/projects/:id/contacts
app.post("/api/projects/:id/contacts", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });

  try {
    const data = createContactSchema.parse(req.body);

    // ensure project exists
    const projectExists = await prisma.project.findUnique({ where: { id } });
    if (!projectExists) return res.status(404).json({ error: "project_not_found" });

    const created = await prisma.contact.create({
      data: {
        projectId: id,
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
      },
    });

    res.status(201).json(created);
  } catch (err: any) {
    console.error(`POST /api/projects/${req.params.id}/contacts error:`, err?.issues ?? err);
    res.status(400).json({ error: err?.issues ?? "Bad request" });
  }
});

// DELETE /api/projects/:id/contacts/:contactId
app.delete("/api/projects/:id/contacts/:contactId", async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);
  const contactId = Number(req.params.contactId);
  if (!Number.isFinite(projectId) || !Number.isFinite(contactId)) return res.status(400).json({ error: "bad id" });

  try {
    const c = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!c || c.projectId !== projectId) return res.sendStatus(404);

    await prisma.contact.delete({ where: { id: contactId } });
    return res.sendStatus(204);
  } catch (err: any) {
    console.error(`DELETE /api/projects/${projectId}/contacts/${contactId} error:`, err);
    return res.status(500).json({ error: "failed_to_delete_contact" });
  }
});

/* ======================
   DELETE /api/projects/:id (remove children then project)
   ====================== */
// (If your FK doesn’t cascade, we remove contacts + assignments first.)
app.delete("/api/projects/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });

  try {
    await prisma.$transaction(async (tx) => {
      // remove contacts (safe even if cascade exists)
      await tx.contact.deleteMany({ where: { projectId: id } });
      // remove assignments (if any)
      await tx.assignment.deleteMany({ where: { projectId: id } });
      // finally project
      await tx.project.delete({ where: { id } });
    });
    res.sendStatus(204);
  } catch (err: any) {
    console.error("Delete project error:", err);
    res.status(400).json({ error: "cannot_delete_project" });
  }
});

// DELETE /api/assignments/:id  -> removes a single assignment
app.delete("/api/assignments/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });

  try {
    await prisma.assignment.delete({ where: { id } });
    return res.status(204).end();
  } catch (err: any) {
    // If it's already gone, treat as 404; otherwise log it
    if (err?.code === "P2025") return res.sendStatus(404);
    console.error("DELETE assignment error:", err);
    return res.status(500).json({ error: "failed_to_delete_assignment" });
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
  projectDate: zDateOpt.optional(),
  execution: z.coerce.number().int().min(0).max(100).optional(),
  remaining: z.string().optional(),

  initialAssignment: z.object({
    title: z.string().min(1),
    notes: z.string().optional(),
    assigneeName: z.string().optional(), // free-text name only
    dueDate: zDateOpt.optional(),
  }).optional(),

  initialContacts: z
    .array(
      z.object({
        name: z.string().min(1),
        phone: z.string().optional(),
      })
    )
    .optional(),
});

app.post("/api/projects", async (req: Request, res: Response) => {
  try {
    const data = createProjectSchema.parse(req.body);

    const project = await prisma.project.create({
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
        // nested creates:
        assignments: data.initialAssignment
          ? {
              create: [
                {
                  title: data.initialAssignment.title,
                  notes: data.initialAssignment.notes ?? undefined,
                  assigneeName: data.initialAssignment.assigneeName ?? undefined,
                  dueDate: data.initialAssignment.dueDate ?? undefined,
                },
              ],
            }
          : undefined,
        contacts: data.initialContacts?.length
          ? {
              create: data.initialContacts.map((c) => ({
                name: c.name,
                phone: c.phone ?? undefined,
              })),
            }
          : undefined,
      },
      include: {
        assignments: { orderBy: { createdAt: "desc" } },
        contacts: { orderBy: { createdAt: "asc" } },
      },
    });

    res.status(201).json(project);
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
