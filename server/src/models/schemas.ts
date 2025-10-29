import { ListKind, ProjectStatus } from "@prisma/client";
import { z } from "zod";

export const listParam = z.nativeEnum(ListKind).catch(ListKind.NEGOTIATION);

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

const zDateOpt = z.coerce.date().optional();

export const createProjectSchema = z.object({
  name: z.string().min(1),
  developer: z.string().optional(),
  listKind: z.nativeEnum(ListKind).optional().default(ListKind.NEGOTIATION),
  status: z.nativeEnum(ProjectStatus).optional().default(ProjectStatus.ACTIVE),
  standard: z.string().optional(),
  units: z.coerce.number().int().nonnegative().optional(),
  scopeValue: z.string().optional(),
  startDate: zDateOpt,
  execution: z.coerce.number().int().min(0).max(100).optional(),
  remaining: z.string().optional(),
  initialAssignment: z.object({
    title: z.string().min(1),
    notes: z.string().optional(),
    assigneeName: z.string().optional(),
    dueDate: zDateOpt.optional(),
  }).optional(),
  initialContacts: z.array(z.object({
    name: z.string().min(1),
    phone: z.string().min(3),
  })).optional(),
});

export const createAssignmentSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  assigneeName: z.string().optional(),
  dueDate: z.coerce.date().optional().nullable(),
});

export const createContactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(3),
});

export { ListKind, ProjectStatus };


