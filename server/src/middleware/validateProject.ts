import { z, ZodSchema, ZodError } from "zod";
import { ListKind, ProjectStatus } from "@prisma/client";
import { Request, Response, NextFunction } from "express";

// Helper: optional date coercion
export const zDateOpt = z.coerce.date().optional();

// PATCH validation
export const updateProjectSchema = z.object({
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

// POST assignment validation
export const createAssignmentSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  assigneeName: z.string().optional(),
  dueDate: z.coerce.date().optional().nullable(),
});

// POST project validation (with optional initial assignment)
export const createProjectSchema = z.object({
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

// --- Validation middleware helpers ---
export function validateBody(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.validatedProject = schema.parse(req.body);
      next();
    } catch (err: unknown) {
      const errorJson = err instanceof ZodError ? err.issues : "Bad request";
      res.status(400).json({ error: errorJson });
    }
  };
}

export function validateAssignmentBody(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.validatedAssignment = schema.parse(req.body);
      next();
    } catch (err: unknown) {
      const errorJson = err instanceof ZodError ? err.issues : "Bad request";
      res.status(400).json({ error: errorJson });
    }
  };
}
