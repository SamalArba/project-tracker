import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

// Extend Express Request interface for custom properties from middleware
declare module "express-serve-static-core" {
  interface Request {
    listKind?: any;
    searchQuery?: string;
  }
}

const prisma = new PrismaClient();

// Health check
export const healthCheck = (_req: Request, res: Response) => {
  res.json({ ok: true, service: "server", ts: new Date().toISOString() });
};

// GET /api/projects?list=...&search=...
export const getProjects = async (req: Request, res: Response) => {
  try {
    // list param is validated by middleware
    const list = req.listKind;
    const q = req.searchQuery;
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
          take: 1,
        },
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
    console.error("GET /api/projects error:", err?.issues ?? err, "req.query:", req.query);
    res.status(500).json({ error: "failed_to_list_projects" });
  }
};

// GET /api/projects/:id
export const getProjectById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });
  const project = await prisma.project.findUnique({
    where: { id },
    include: { assignments: { orderBy: { createdAt: "desc" } } },
  });
  if (!project) return res.sendStatus(404);
  res.json(project);
};

// PATCH /api/projects/:id
export const updateProject = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });
  try {
    // data is validated by middleware
    const data = req.validatedProject;
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
};

// POST /api/projects/:id/assignments
export const createAssignment = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });
  try {
    // data is validated by middleware
    const data = req.validatedAssignment;
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
};

// DELETE /api/projects/:id
export const deleteProject = async (req: Request, res: Response) => {
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
};

// POST /api/projects
export const createProject = async (req: Request, res: Response) => {
  try {
    const data = req.validatedProject;
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
};
