/**
 * ================================================================
 * controllers/projectController.ts - API Request Handlers
 * ================================================================
 * 
 * Contains all controller functions for handling API requests.
 * 
 * Sections:
 * - Health check
 * - Project CRUD operations
 * - Assignment (task) management
 * - Contact management
 * - File management (upload, download, delete)
 * 
 * All functions follow Express handler signature: (req, res) => void
 */

// ================================================================
// IMPORTS
// ================================================================
import { Request, Response, NextFunction } from "express"
import { prisma } from "../models/prisma"
import { 
  createAssignmentSchema, 
  createContactSchema, 
  createProjectSchema, 
  listParam, 
  updateProjectSchema 
} from "../models/schemas"
import { shapeProjectList } from "../views/projectView"
import path from "path"
import fs from "fs/promises"
import jwt from "jsonwebtoken"
import { uploadToS3, getFromS3, deleteFromS3 } from "../services/s3"

// ================================================================
// UTILITY FUNCTIONS
// ================================================================
/**
 * Decode potentially mangled Hebrew filenames
 * 
 * Files uploaded with Hebrew names can be corrupted by encoding issues.
 * This function attempts to recover the original Hebrew text by:
 * 1. Trying latin1->utf8 conversion
 * 2. Scoring each candidate based on Hebrew characters
 * 3. Returning the best match
 * 
 * @param original - The potentially corrupted filename
 * @returns Decoded filename with proper Hebrew characters
 */
function decodeFilename(original: string): string {
  // Try both the original and latin1->utf8 conversion
  const candidate1 = original
  let candidate2 = original
  
  try { 
    candidate2 = Buffer.from(original, 'latin1').toString('utf8') 
  } catch {}
  
  /**
   * Score a string based on Hebrew content quality
   * Higher score = more likely to be correct
   */
  const score = (s: string) => {
    let heb = 0      // Count Hebrew characters
    let repl = 0     // Count replacement characters (�)
    
    for (const ch of s) {
      const code = ch.charCodeAt(0)
      // Hebrew Unicode range: U+0590 to U+05FF
      if (code >= 0x0590 && code <= 0x05FF) heb++
      // Replacement character indicates encoding error
      if (ch === '\uFFFD') repl++
    }
    
    // Scoring: Hebrew chars are good, replacement chars are bad
    return heb * 10 - repl * 5 - (s.includes('Ã') || s.includes('×') ? 2 : 0)
  }
  
  // Return the candidate with better score
  return score(candidate2) > score(candidate1) ? candidate2 : candidate1
}

// ================================================================
// AUTH CONFIG
// ================================================================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme"
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-change-me"

// ================================================================
// HEALTH CHECK
// ================================================================
/**
 * GET /api/health
 * 
 * Simple health check endpoint to verify server is running.
 * 
 * @returns JSON with ok status and timestamp
 */
export async function getHealth(_req: Request, res: Response) {
  res.json({ 
    ok: true, 
    service: "server", 
    ts: new Date().toISOString() 
  })
}

// ================================================================
// AUTH - LOGIN & MIDDLEWARE
// ================================================================

/**
 * POST /api/login
 *
 * Very simple password-based login for internal use.
 * Compares the provided password to ADMIN_PASSWORD env var.
 * On success returns a signed JWT token.
 */
export async function login(req: Request, res: Response) {
  const password: unknown = req.body?.password

  if (typeof password !== "string" || password.length === 0) {
    return res.status(400).json({ error: "missing_password" })
  }

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "invalid_credentials" })
  }

  const token = jwt.sign(
    { role: "admin" },
    JWT_SECRET,
    { expiresIn: "7d" }
  )

  res.json({ token })
}

/**
 * Auth middleware - protects all API routes after /health and /login.
 * Expects an Authorization: Bearer <token> header with a valid JWT.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization

  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const token = auth.slice(7).trim()

  try {
    jwt.verify(token, JWT_SECRET)
    return next()
  } catch {
    return res.status(401).json({ error: "unauthorized" })
  }
}

// ================================================================
// PROJECT - LIST
// ================================================================
/**
 * GET /api/projects?list={NEGOTIATION|SIGNED|ARCHIVE}&search={query}
 * 
 * List all projects in a specific list with optional search.
 * 
 * Query Parameters:
 * - list: Which list to fetch (NEGOTIATION, SIGNED, ARCHIVE)
 * - search: Optional search query (searches name, developer, scopeValue)
 * 
 * Returns: Array of project summaries with last assignment info
 */
export async function listProjects(req: Request, res: Response) {
  try {
    // Validate and parse list parameter
    const list = listParam.parse(req.query.list)
    const q = (req.query.search as string | undefined)?.trim()

    // Build WHERE clause
    const where: any = { listKind: list }
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { developer: { contains: q } },
        { scopeValue: { contains: q } },
      ]
    }

    // Fetch projects with their most recent assignment
    const items = await prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        assignments: {
          orderBy: { createdAt: "desc" },
          take: 1,  // Only get the most recent assignment
        },
      },
    })

    // Shape data for frontend consumption
    res.json(shapeProjectList(items))
  } catch (err: any) {
    console.error("GET /api/projects error:", err?.issues ?? err, "req.query:", req.query)
    res.status(500).json({ error: "failed_to_list_projects" })
  }
}

// ================================================================
// PROJECT - GET SINGLE
// ================================================================
/**
 * GET /api/projects/:id
 * 
 * Get full details of a single project.
 * 
 * Includes:
 * - All project fields
 * - All assignments (sorted by creation date)
 * - All contacts (sorted by creation date)
 * 
 * @returns Full project object or 404 if not found
 */
export async function getProject(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" })
  
  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        assignments: { orderBy: { createdAt: "desc" } },
        contacts: { orderBy: { createdAt: "desc" } },
      } as any,
    })
    
    if (!project) return res.sendStatus(404)
    
    res.json(project)
  } catch (err: any) {
    console.error("GET /api/projects/:id error:", err)
    res.status(500).json({ error: "failed_to_load_project" })
  }
}

// ================================================================
// PROJECT - UPDATE
// ================================================================
/**
 * PATCH /api/projects/:id
 * 
 * Update an existing project (partial update).
 * 
 * Features:
 * - Auto-calculates remaining budget if scopeValue and execution provided
 * - Only updates fields that are present in request body
 * - Handles null values properly (converts to undefined for Prisma)
 * 
 * @returns Updated project object
 */
export async function patchProject(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" })

  try {
    const data = updateProjectSchema.parse(req.body)
    
    // Auto-calculate remaining budget (amount left) if applicable
    const hasScope = Object.prototype.hasOwnProperty.call(data, 'scopeValue')
    const hasExec = Object.prototype.hasOwnProperty.call(data, 'execution')
    
    if ((hasScope || hasExec) && data.remaining === undefined) {
      const scope = typeof data.scopeValue === 'string' ? data.scopeValue : undefined
      const e = data.execution == null ? undefined : data.execution
      
      if (scope && typeof e === 'number') {
        // Extract numeric value from scope (e.g., "₪1,000,000" -> 1000000)
        const numericScope = Number(scope.replace(/[^0-9]/g, ''))
        
        if (Number.isFinite(numericScope)) {
          // Calculate remaining amount: scope * (1 - execution/100)
          const clamped = Math.max(0, Math.min(100, e))
          const remainingPct = 100 - clamped
          const rem = Math.max(0, Math.round((numericScope * remainingPct) / 100))
          ;(data as any).remaining = String(rem)
        }
      }
    }
    
    // Convert null to undefined for Prisma (Prisma doesn't accept null for optional fields)
    const clean: Record<string, any> = {}
    for (const [k, v] of Object.entries(data)) {
      clean[k] = v === null ? undefined : v
    }

    const updated = await prisma.project.update({ 
      where: { id }, 
      data: clean 
    })
    
    res.json(updated)
  } catch (err: any) {
    console.error("PATCH project error:", err?.issues ?? err)
    res.status(400).json({ error: err?.issues ?? "Bad request" })
  }
}

// ================================================================
// PROJECT - CREATE
// ================================================================
/**
 * POST /api/projects
 * 
 * Create a new project with optional initial assignment and contacts.
 * 
 * Features:
 * - Auto-calculates remaining budget from scopeValue and execution
 * - Optionally creates initial assignment (task)
 * - Optionally creates multiple initial contacts
 * - All operations in a database transaction
 * 
 * @returns Created project with initialAssignment (if created)
 */
export async function createProject(req: Request, res: Response) {
  try {
    const data = createProjectSchema.parse(req.body)
    
    // Auto-calculate remaining budget (amount left) if not provided
    if (
      data.remaining == null &&
      typeof data.scopeValue === "string" &&
      typeof data.execution === "number"
    ) {
      const numericScope = Number(data.scopeValue.replace(/[^0-9]/g, ""))

      if (Number.isFinite(numericScope)) {
        const clamped = Math.max(0, Math.min(100, data.execution))
        const remainingPct = 100 - clamped
        const rem = Math.max(0, Math.round((numericScope * remainingPct) / 100))
        ;(data as any).remaining = String(rem)
      }
    }
    
    // Execute in transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the project
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
      })

      // 2. Create initial assignment if provided
      let createdAssignment: unknown = null
      if (data.initialAssignment) {
        const { title, notes, assigneeName, dueDate } = data.initialAssignment
        createdAssignment = await tx.assignment.create({
          data: {
            projectId: project.id,
            title,
            notes,
            assigneeName: assigneeName?.trim() || undefined,
            dueDate: dueDate ?? undefined,
          },
        })
      }

      // 3. Create initial contacts if provided
      if (data.initialContacts && data.initialContacts.length > 0) {
        await (tx as any).contact.createMany({
          data: data.initialContacts.map(c => ({
            projectId: project.id,
            name: c.name.trim(),
            phone: c.phone.trim(),
          })),
        })
      }

      return { project, initialAssignment: createdAssignment }
    })

    res.status(201).json(result)
  } catch (err: any) {
    console.error("Create project error:", err?.issues ?? err)
    res.status(400).json({ error: err?.issues ?? "Bad request" })
  }
}

// ================================================================
// PROJECT - DELETE
// ================================================================
/**
 * DELETE /api/projects/:id
 * 
 * Delete a project and all its related data.
 * 
 * Cascade deletes:
 * - All assignments (via Prisma schema)
 * - All contacts (via Prisma schema)
 * - All files (via Prisma schema)
 * 
 * Note: Physical files on disk are NOT deleted automatically.
 *       They should be cleaned up separately.
 * 
 * @returns 204 No Content on success
 */
export async function deleteProject(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" })

  try {
    await prisma.$transaction(async (tx) => {
      // Delete assignments first (explicit for clarity)
      await tx.assignment.deleteMany({ where: { projectId: id } })
      // Delete project (will cascade to contacts and files via schema)
      await tx.project.delete({ where: { id } })
    })
    
    res.sendStatus(204)
  } catch (err: any) {
    console.error("Delete project error:", err)
    res.status(400).json({ error: "cannot_delete_project" })
  }
}

// ================================================================
// ASSIGNMENT (TASK) - CREATE
// ================================================================
/**
 * POST /api/projects/:id/assignments
 * 
 * Create a new assignment/task for a project.
 * 
 * @param id - Project ID (from URL)
 * @returns Created assignment object
 */
export async function createAssignment(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" })

  try {
    const data = createAssignmentSchema.parse(req.body)
    
    const created = await prisma.assignment.create({
      data: {
        projectId: id,
        title: data.title,
        notes: data.notes,
        assigneeName: data.assigneeName?.trim() || undefined,
        dueDate: data.dueDate ?? undefined,
      },
    })
    
    res.status(201).json(created)
  } catch (err: any) {
    console.error("Create assignment error:", err?.issues ?? err)
    res.status(400).json({ error: err?.issues ?? "Bad request" })
  }
}

// ================================================================
// ASSIGNMENT (TASK) - DELETE
// ================================================================
/**
 * DELETE /api/assignments/:id
 * 
 * Delete a specific assignment/task.
 * 
 * @param id - Assignment ID (from URL)
 * @returns 204 No Content on success
 */
export async function deleteAssignment(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" })
  
  try {
    await prisma.assignment.delete({ where: { id } })
    res.sendStatus(204)
  } catch (err: any) {
    console.error("Delete assignment error:", err)
    res.status(400).json({ error: "cannot_delete_assignment" })
  }
}

// ================================================================
// CONTACT - CREATE
// ================================================================
/**
 * POST /api/projects/:id/contacts
 * 
 * Create a new contact for a project.
 * 
 * @param id - Project ID (from URL)
 * @returns Created contact object
 */
export async function createContact(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" })
  
  try {
    const data = createContactSchema.parse(req.body)
    
    const created = await (prisma as any).contact.create({
      data: { 
        projectId: id, 
        name: data.name.trim(), 
        phone: data.phone.trim() 
      },
    })
    
    res.status(201).json(created)
  } catch (err: any) {
    console.error("Create contact error:", err?.issues ?? err)
    res.status(400).json({ error: err?.issues ?? "Bad request" })
  }
}

// ================================================================
// CONTACT - DELETE
// ================================================================
/**
 * DELETE /api/contacts/:id
 * 
 * Delete a specific contact.
 * 
 * @param id - Contact ID (from URL)
 * @returns 204 No Content on success
 */
export async function deleteContact(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" })
  
  try {
    await (prisma as any).contact.delete({ where: { id } })
    res.sendStatus(204)
  } catch (err: any) {
    console.error("Delete contact error:", err)
    res.status(400).json({ error: "cannot_delete_contact" })
  }
}

// ================================================================
// FILE - UPLOAD
// ================================================================
/**
 * POST /api/projects/:id/files
 * 
 * Upload a file and attach it to a project.
 * 
 * Expects multipart/form-data with 'file' field.
 * File is saved to disk by multer middleware before this handler runs.
 * 
 * Features:
 * - Decodes Hebrew filenames properly
 * - Stores metadata in database
 * - Links file to project
 * 
 * @param id - Project ID (from URL)
 * @returns Created file record
 */
export async function uploadFile(req: Request, res: Response) {
  const projectId = Number(req.params.id)
  if (!Number.isFinite(projectId)) return res.status(400).json({ error: "bad id" })

  if (!req.file) return res.status(400).json({ error: "no_file_uploaded" })

  try {
    // Read file from local uploads directory
    const filePath = path.join(__dirname, "../../uploads", req.file.filename)
    const buffer = await fs.readFile(filePath)

    // Upload to S3 using storedName as the object key
    await uploadToS3(req.file.filename, buffer, req.file.mimetype)

    const file = await (prisma as any).projectFile.create({
      data: {
        projectId,
        originalName: decodeFilename(req.file.originalname),
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    })
    
    res.status(201).json(file)
  } catch (err: any) {
    console.error("Upload file error:", err)
    res.status(500).json({ error: "failed_to_upload_file" })
  }
}

// ================================================================
// FILE - LIST
// ================================================================
/**
 * GET /api/projects/:id/files
 * 
 * List all files attached to a project.
 * 
 * Features:
 * - Sorted by creation date (newest first)
 * - Decodes Hebrew filenames
 * 
 * @param id - Project ID (from URL)
 * @returns Array of file records
 */
export async function listFiles(req: Request, res: Response) {
  const projectId = Number(req.params.id)
  if (!Number.isFinite(projectId)) return res.status(400).json({ error: "bad id" })

  try {
    const files = await (prisma as any).projectFile.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    })
    
    // Decode Hebrew filenames before sending
    const shaped = files.map((f: any) => ({ 
      ...f, 
      originalName: decodeFilename(f.originalName) 
    }))
    
    res.json(shaped)
  } catch (err: any) {
    console.error("List files error:", err)
    res.status(500).json({ error: "failed_to_list_files" })
  }
}

// ================================================================
// FILE - DOWNLOAD
// ================================================================
/**
 * GET /api/files/:fileId
 * 
 * Download a specific file.
 * 
 * Features:
 * - Sets proper Content-Type header
 * - Uses Content-Disposition for download with proper filename
 * - Handles Hebrew filenames with UTF-8 encoding
 * - Falls back to ASCII-safe filename if needed
 * 
 * @param fileId - File ID (from URL)
 * @returns File stream with proper headers
 */
export async function downloadFile(req: Request, res: Response) {
  const fileId = Number(req.params.fileId)
  if (!Number.isFinite(fileId)) return res.status(400).json({ error: "bad id" })

  try {
    const file = await (prisma as any).projectFile.findUnique({ 
      where: { id: fileId } 
    })
    
    if (!file) return res.sendStatus(404)

    const filename = decodeFilename(file.originalName)
    
    // Create ASCII-safe fallback (replace non-ASCII with underscore)
    const fallback = filename.replace(/[^\t\n\r\x20-\x7E]/g, '_')
    
    // URL-encode for UTF-8 support (RFC 5987)
    const encoded = encodeURIComponent(filename)
    
    // Fetch file from S3
    const s3Object = await getFromS3(file.storedName)

    // Set response headers
    res.setHeader('Content-Type', (file.mimeType as string) || 'application/octet-stream')
    res.setHeader(
      'Content-Disposition', 
      `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`
    )
    
    // Stream file to client
    // In Node, Body is a readable stream
    const bodyStream: any = (s3Object as any).Body
    if (!bodyStream || typeof bodyStream.pipe !== "function") {
      throw new Error("Invalid S3 object body")
    }
    bodyStream.pipe(res)
  } catch (err: any) {
    console.error("Download file error:", err)
    res.status(500).json({ error: "failed_to_download_file" })
  }
}

// ================================================================
// FILE - DELETE
// ================================================================
/**
 * DELETE /api/files/:fileId
 * 
 * Delete a file (both from disk and database).
 * 
 * Steps:
 * 1. Find file record in database
 * 2. Delete physical file from disk (with error handling)
 * 3. Delete database record
 * 
 * Note: If physical file is missing, still deletes DB record.
 * 
 * @param fileId - File ID (from URL)
 * @returns 204 No Content on success
 */
export async function deleteFile(req: Request, res: Response) {
  const fileId = Number(req.params.fileId)
  if (!Number.isFinite(fileId)) return res.status(400).json({ error: "bad id" })

  try {
    const file = await (prisma as any).projectFile.findUnique({ 
      where: { id: fileId } 
    })
    
    if (!file) return res.sendStatus(404)

    const filePath = path.join(__dirname, "../../uploads", file.storedName)
    
    // Attempt to delete physical file from disk
    try {
      await fs.unlink(filePath)
    } catch (fsErr: any) {
      // File may have been manually deleted - log warning but continue
      console.warn("File not found on disk (may have been deleted manually):", fsErr.message)
    }

    // Delete from S3 (ignore errors to avoid blocking)
    try {
      await deleteFromS3(file.storedName)
    } catch (s3Err: any) {
      console.warn("Failed to delete file from S3:", s3Err?.message ?? s3Err)
    }

    // Delete database record
    await (prisma as any).projectFile.delete({ where: { id: fileId } })
    
    res.sendStatus(204)
  } catch (err: any) {
    console.error("Delete file error:", err)
    res.status(400).json({ error: "cannot_delete_file" })
  }
}

// ================================================================
// BACKUP - EXPORT / IMPORT
// ================================================================

/**
 * GET /api/backup
 *
 * Export a full JSON backup of all projects (including assignments & contacts).
 * Files are not included because physical uploads live separately on disk.
 */
export async function exportBackup(_req: Request, res: Response) {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { id: "asc" },
      include: {
        assignments: true,
        contacts: true,
      },
    })

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      projectCount: projects.length,
      projects,
    }

    const json = JSON.stringify(payload, null, 2)
    const date = new Date().toISOString().slice(0, 10)

    res.setHeader("Content-Type", "application/json; charset=utf-8")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=\"project-backup-${date}.json\"`
    )

    res.send(json)
  } catch (err: any) {
    console.error("Export backup error:", err)
    res.status(500).json({ error: "failed_to_export_backup" })
  }
}

type BackupPayload = {
  version: number
  projects: any[]
}

/**
 * POST /api/backup
 *
 * Restore data from a JSON backup created by exportBackup.
 * This is a destructive operation: it clears existing projects,
 * assignments and contacts before inserting backup data.
 */
export async function importBackup(req: Request, res: Response) {
  const body = req.body as BackupPayload | undefined

  if (!body || !Array.isArray(body.projects)) {
    return res.status(400).json({ error: "invalid_backup_format" })
  }

  const projects = body.projects

  try {
    const result = await prisma.$transaction(async tx => {
      // Clear existing data
      await tx.assignment.deleteMany({})
      await (tx as any).contact.deleteMany({})
      await (tx as any).projectFile.deleteMany({})
      await tx.project.deleteMany({})

      let createdProjects = 0

      for (const p of projects) {
        const {
          assignments,
          contacts,
          files, // ignored in backup/restore
          id,
          createdAt,
          updatedAt,
          ...rest
        } = p as any

        const project = await tx.project.create({
          data: {
            name: rest.name,
            developer: rest.developer ?? null,
            listKind: rest.listKind,
            status: rest.status,
            standard: rest.standard ?? null,
            units: rest.units ?? null,
            scopeValue: rest.scopeValue ?? null,
            startDate: rest.startDate ? new Date(rest.startDate) : null,
            execution: rest.execution ?? null,
            remaining: rest.remaining ?? null,
          },
        })

        createdProjects++

        if (Array.isArray(assignments) && assignments.length > 0) {
          for (const a of assignments as any[]) {
            await tx.assignment.create({
              data: {
                projectId: project.id,
                title: a.title,
                assigneeName: a.assigneeName ?? null,
                notes: a.notes ?? null,
                dueDate: a.dueDate ? new Date(a.dueDate) : null,
                status: a.status ?? "TODO",
              },
            })
          }
        }

        if (Array.isArray(contacts) && contacts.length > 0) {
          await (tx as any).contact.createMany({
            data: contacts.map((c: any) => ({
              projectId: project.id,
              name: String(c.name ?? "").trim(),
              phone: String(c.phone ?? "").trim(),
            })),
          })
        }
      }

      return { createdProjects }
    })

    res.json({ ok: true, ...result })
  } catch (err: any) {
    console.error("Import backup error:", err)
    res.status(500).json({ error: "failed_to_import_backup" })
  }
}