/**
 * ================================================================
 * routes/projects.ts - API Route Definitions
 * ================================================================
 * 
 * Defines all API routes and maps them to controller functions.
 * 
 * Route Groups:
 * - Health check
 * - Project CRUD
 * - Assignment (task) management
 * - Contact management
 * - File operations
 * 
 * All routes are mounted under /api prefix in index.ts
 */

// ================================================================
// IMPORTS
// ================================================================
import { Router } from "express"
import {
  createAssignment,
  createProject,
  deleteProject,
  createContact,
  deleteContact,
  deleteAssignment,
  getHealth,
  login,
  requireAuth,
  getProject,
  listProjects,
  patchProject,
  uploadFile,
  listFiles,
  downloadFile,
  deleteFile,
  exportBackup,
  importBackup,
} from "../controllers/projectController"
import upload from "../middleware/upload"

// ================================================================
// ROUTER INSTANCE
// ================================================================
export const router = Router()

// ================================================================
// ROUTE DEFINITIONS
// ================================================================

// ========== PUBLIC ROUTES (NO AUTH) ==========
/**
 * GET /api/health
 * Simple health check endpoint
 */
router.get("/health", getHealth)

/**
 * POST /api/login
 * Very simple password-based login for internal use.
 */
router.post("/login", login)

// All routes below this line require authentication
router.use(requireAuth)

// ========== PROJECT ROUTES ==========
/**
 * GET /api/projects?list={kind}&search={query}
 * List projects by category with optional search
 */
router.get("/projects", listProjects)

/**
 * GET /api/projects/:id
 * Get single project with full details
 */
router.get("/projects/:id", getProject)

/**
 * PATCH /api/projects/:id
 * Update an existing project (partial update)
 */
router.patch("/projects/:id", patchProject)

/**
 * POST /api/projects
 * Create a new project
 */
router.post("/projects", createProject)

/**
 * DELETE /api/projects/:id
 * Delete a project and all related data
 */
router.delete("/projects/:id", deleteProject)

// ========== ASSIGNMENT (TASK) ROUTES ==========
/**
 * POST /api/projects/:id/assignments
 * Create a new task for a project
 */
router.post("/projects/:id/assignments", createAssignment)

/**
 * DELETE /api/assignments/:id
 * Delete a specific task
 */
router.delete("/assignments/:id", deleteAssignment)

// ========== CONTACT ROUTES ==========
/**
 * POST /api/projects/:id/contacts
 * Add a contact to a project
 */
router.post("/projects/:id/contacts", createContact)

/**
 * DELETE /api/contacts/:id
 * Delete a specific contact
 */
router.delete("/contacts/:id", deleteContact)

// ========== FILE ROUTES ==========
/**
 * POST /api/projects/:id/files
 * Upload a file and attach to project
 * 
 * Expects multipart/form-data with 'file' field
 * Uses multer middleware for file handling
 */
router.post("/projects/:id/files", upload.single("file"), uploadFile)

/**
 * GET /api/projects/:id/files
 * List all files attached to a project
 */
router.get("/projects/:id/files", listFiles)

/**
 * GET /api/files/:fileId
 * Download a specific file
 */
router.get("/files/:fileId", downloadFile)

/**
 * DELETE /api/files/:fileId
 * Delete a file (from disk and database)
 */
router.delete("/files/:fileId", deleteFile)

// ========== BACKUP ROUTES ==========
/**
 * GET /api/backup
 * Download JSON backup of all projects (and related data)
 */
router.get("/backup", exportBackup)

/**
 * POST /api/backup
 * Restore projects from JSON backup (destructive)
 */
router.post("/backup", importBackup)
