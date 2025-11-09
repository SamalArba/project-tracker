/**
 * ================================================================
 * models/schemas.ts - Zod Validation Schemas
 * ================================================================
 * 
 * Defines runtime validation schemas using Zod for all API inputs.
 * These schemas ensure type safety and data validation at runtime.
 * 
 * Exports:
 * - listParam: Validates list kind query parameter
 * - updateProjectSchema: Validates project update requests
 * - createProjectSchema: Validates project creation with optional initial data
 * - createAssignmentSchema: Validates assignment/task creation
 * - createContactSchema: Validates contact creation
 * - Enum re-exports from Prisma
 */

// ================================================================
// IMPORTS
// ================================================================
import { ListKind, ProjectStatus } from "@prisma/client"
import { z } from "zod"

// ================================================================
// QUERY PARAMETER SCHEMAS
// ================================================================
/**
 * Validates list kind query parameter
 * 
 * Falls back to NEGOTIATION if invalid value provided.
 * Used in GET /api/projects?list=...
 */
export const listParam = z.nativeEnum(ListKind).catch(ListKind.NEGOTIATION)

// ================================================================
// PROJECT SCHEMAS
// ================================================================
/**
 * Schema for updating an existing project (PATCH)
 * 
 * All fields are optional - only provided fields will be updated.
 * Supports partial updates.
 */
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
})

/**
 * Optional date field helper
 * Coerces to Date object or undefined
 */
const zDateOpt = z.coerce.date().optional()

/**
 * Schema for creating a new project (POST)
 * 
 * Includes optional nested objects for:
 * - initialAssignment: Create first task with the project
 * - initialContacts: Add initial contacts during creation
 * 
 * Defaults:
 * - listKind: NEGOTIATION
 * - status: ACTIVE
 */
export const createProjectSchema = z.object({
  // Required fields
  name: z.string().min(1),
  
  // Basic project info (optional)
  developer: z.string().optional(),
  listKind: z.nativeEnum(ListKind).optional().default(ListKind.NEGOTIATION),
  status: z.nativeEnum(ProjectStatus).optional().default(ProjectStatus.ACTIVE),
  standard: z.string().optional(),
  units: z.coerce.number().int().nonnegative().optional(),
  scopeValue: z.string().optional(),
  startDate: zDateOpt,
  execution: z.coerce.number().int().min(0).max(100).optional(),
  remaining: z.string().optional(),
  
  // Optional initial assignment (task)
  initialAssignment: z.object({
    title: z.string().min(1),
    notes: z.string().optional(),
    assigneeName: z.string().optional(),
    dueDate: zDateOpt.optional(),
  }).optional(),
  
  // Optional initial contacts array
  initialContacts: z.array(z.object({
    name: z.string().min(1),
    phone: z.string().min(3),
  })).optional(),
})

// ================================================================
// ASSIGNMENT (TASK) SCHEMA
// ================================================================
/**
 * Schema for creating a new assignment/task
 * 
 * Fields:
 * - title: Required task description
 * - notes: Optional additional details
 * - assigneeName: Optional person assigned to task
 * - dueDate: Optional deadline
 */
export const createAssignmentSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  assigneeName: z.string().optional(),
  dueDate: z.coerce.date().optional().nullable(),
})

// ================================================================
// CONTACT SCHEMA
// ================================================================
/**
 * Schema for creating a new contact
 * 
 * Fields:
 * - name: Contact name (required, min 1 char)
 * - phone: Phone number (required, min 3 chars)
 */
export const createContactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(3),
})

// ================================================================
// RE-EXPORTS
// ================================================================
/**
 * Re-export Prisma enums for use in other modules
 */
export { ListKind, ProjectStatus }
