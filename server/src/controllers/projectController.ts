import { Request, Response } from "express";
import { prisma } from "../models/prisma";
import { createAssignmentSchema, createContactSchema, createProjectSchema, listParam, updateProjectSchema } from "../models/schemas";
import { shapeProjectList } from "../views/projectView";

export async function getHealth(_req: Request, res: Response) {
  res.json({ ok: true, service: "server", ts: new Date().toISOString() });
}

export async function listProjects(req: Request, res: Response) {
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
          take: 1,
        },
      },
    });

    res.json(shapeProjectList(items));
  } catch (err: any) {
    console.error("GET /api/projects error:", err?.issues ?? err, "req.query:", req.query);
    res.status(500).json({ error: "failed_to_list_projects" });
  }
}

export async function getProject(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });
  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        assignments: { orderBy: { createdAt: "desc" } },
        contacts: { orderBy: { createdAt: "desc" } },
      } as any,
    });
    if (!project) return res.sendStatus(404);
    res.json(project);
  } catch (err: any) {
    console.error("GET /api/projects/:id error:", err);
    res.status(500).json({ error: "failed_to_load_project" });
  }
}

export async function patchProject(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });

  try {
    const data = updateProjectSchema.parse(req.body);
    // If scopeValue and execution provided, auto-calc remaining when not explicitly set
    const hasScope = Object.prototype.hasOwnProperty.call(data, 'scopeValue');
    const hasExec  = Object.prototype.hasOwnProperty.call(data, 'execution');
    if ((hasScope || hasExec) && data.remaining === undefined) {
      const scope = typeof data.scopeValue === 'string' ? data.scopeValue : undefined;
      const e = data.execution == null ? undefined : data.execution;
      if (scope && typeof e === 'number') {
        const numericScope = Number(scope.replace(/[^0-9]/g, ''));
        if (Number.isFinite(numericScope)) {
          const rem = Math.max(0, Math.round(numericScope * e / 100));
          (data as any).remaining = String(rem);
        }
      }
    }
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) clean[k] = v === null ? undefined : v;

    const updated = await prisma.project.update({ where: { id }, data: clean });
    res.json(updated);
  } catch (err: any) {
    console.error("PATCH project error:", err?.issues ?? err);
    res.status(400).json({ error: err?.issues ?? "Bad request" });
  }
}

export async function createAssignment(req: Request, res: Response) {
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
}

export async function deleteProject(req: Request, res: Response) {
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
}

export async function createProject(req: Request, res: Response) {
  try {
    const data = createProjectSchema.parse(req.body);
    // Auto-calc remaining if not provided but scopeValue+execution are
    if (data.remaining == null && typeof data.scopeValue === 'string' && typeof data.execution === 'number') {
      const numericScope = Number(data.scopeValue.replace(/[^0-9]/g, ''));
      if (Number.isFinite(numericScope)) {
        const rem = Math.max(0, Math.round(numericScope * data.execution / 100));
        (data as any).remaining = String(rem);
      }
    }
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

      if (data.initialContacts && data.initialContacts.length > 0) {
        await (tx as any).contact.createMany({
          data: data.initialContacts.map(c => ({
            projectId: project.id,
            name: c.name.trim(),
            phone: c.phone.trim(),
          })),
        });
      }

      return { project, initialAssignment: createdAssignment };
    });

    res.status(201).json(result);
  } catch (err: any) {
    console.error("Create project error:", err?.issues ?? err);
    res.status(400).json({ error: err?.issues ?? "Bad request" });
  }
}

export async function createContact(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });
  try {
    const data = createContactSchema.parse(req.body);
    const created = await (prisma as any).contact.create({
      data: { projectId: id, name: data.name.trim(), phone: data.phone.trim() },
    });
    res.status(201).json(created);
  } catch (err: any) {
    console.error("Create contact error:", err?.issues ?? err);
    res.status(400).json({ error: err?.issues ?? "Bad request" });
  }
}

export async function deleteContact(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });
  try {
    await (prisma as any).contact.delete({ where: { id } });
    res.sendStatus(204);
  } catch (err: any) {
    console.error("Delete contact error:", err);
    res.status(400).json({ error: "cannot_delete_contact" });
  }
}

export async function deleteAssignment(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });
  try {
    await prisma.assignment.delete({ where: { id } });
    res.sendStatus(204);
  } catch (err: any) {
    console.error("Delete assignment error:", err);
    res.status(400).json({ error: "cannot_delete_assignment" });
  }
}


