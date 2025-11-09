/**
 * ================================================================
 * views/projectView.ts - Data Transformation Layer
 * ================================================================
 * 
 * Transforms database entities into API response formats.
 * 
 * Purpose:
 * - Shape raw Prisma data for frontend consumption
 * - Add computed fields (e.g., last task info)
 * - Normalize null/undefined handling
 * - Keep API contract separate from database schema
 * 
 * This layer allows the database schema to evolve independently
 * from the API interface exposed to clients.
 */

// ================================================================
// IMPORTS
// ================================================================
import { Assignment, Project } from "@prisma/client"

// ================================================================
// TYPE DEFINITIONS
// ================================================================
/**
 * Project with its assignments included
 * 
 * This is the shape of data returned from Prisma queries
 * that include the assignments relation.
 */
type ProjectWithAssignments = Project & { 
  assignments: Assignment[] 
}

// ================================================================
// DATA SHAPING FUNCTIONS
// ================================================================
/**
 * Transform project list for API response
 * 
 * Takes raw Prisma data and shapes it for frontend consumption.
 * 
 * Transformations:
 * - Extracts most recent assignment info (last task)
 * - Flattens assignment data to top-level fields
 * - Normalizes null/undefined values
 * - Uses assignment due date if available, otherwise creation date
 * 
 * @param items - Array of projects with their assignments
 * @returns Array of shaped project objects ready for API response
 * 
 * Example output:
 * {
 *   id: 1,
 *   name: "Project Alpha",
 *   developer: "Acme Corp",
 *   status: "ACTIVE",
 *   lastTaskTitle: "Send proposal",
 *   lastHandlerName: "John Doe",
 *   lastTaskDate: "2024-01-15T10:00:00Z",
 *   ...
 * }
 */
export function shapeProjectList(items: ProjectWithAssignments[]) {
  return items.map((p) => {
    // Get most recent assignment (first in array due to DESC sort)
    const last = p.assignments[0]
    
    return {
      // Core project fields
      id: p.id,
      name: p.name,
      developer: p.developer ?? null,
      status: p.status,
      scopeValue: p.scopeValue ?? null,
      units: p.units ?? null,
      standard: p.standard ?? null,
      execution: p.execution ?? null,
      remaining: p.remaining ?? null,
      startDate: p.startDate ?? null,
      
      // Last assignment info (for sorting and display)
      lastTaskTitle: last?.title ?? null,
      lastHandlerName: last?.assigneeName ?? null,
      // Prefer due date over creation date for task tracking
      lastTaskDate: (last?.dueDate ?? last?.createdAt) ?? null,
      
      // Metadata
      createdAt: p.createdAt,
    }
  })
}
