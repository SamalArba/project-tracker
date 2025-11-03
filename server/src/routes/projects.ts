import { Router } from "express";
import {
  createAssignment,
  createProject,
  deleteProject,
  createContact,
  deleteContact,
  deleteAssignment,
  getHealth,
  getProject,
  listProjects,
  patchProject,
} from "../controllers/projectController";

export const router = Router();

router.get("/health", getHealth);

router.get("/projects", listProjects);
router.get("/projects/:id", getProject);
router.patch("/projects/:id", patchProject);
router.post("/projects", createProject);
router.post("/projects/:id/assignments", createAssignment);
router.delete("/projects/:id", deleteProject);
router.post("/projects/:id/contacts", createContact);
router.delete("/contacts/:id", deleteContact);
router.delete("/assignments/:id", deleteAssignment);


