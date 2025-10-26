import express from "express";
import * as projectsController from "./controllers/projectsController";
import { updateProjectSchema, createAssignmentSchema, createProjectSchema, validateBody, validateAssignmentBody } from "./middleware/validateProject";

// --- Augment Express Request type for validated fields ---
declare module "express-serve-static-core" {
  interface Request {
    validatedProject?: any;
    validatedAssignment?: any;
  }
}

const router = express.Router();

// --- health ---
router.get("/api/health", projectsController.healthCheck);

// --- projects CRUD ---
router.get("/api/projects", projectsController.getProjects);
router.get("/api/projects/:id", projectsController.getProjectById);
router.patch("/api/projects/:id", validateBody(updateProjectSchema), projectsController.updateProject);
router.post("/api/projects", validateBody(createProjectSchema), projectsController.createProject);
router.delete("/api/projects/:id", projectsController.deleteProject);

// --- assignments ---
router.post(
  "/api/projects/:id/assignments",
  validateAssignmentBody(createAssignmentSchema),
  projectsController.createAssignment
);

export default router;
