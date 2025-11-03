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
  uploadFile,
  listFiles,
  downloadFile,
  deleteFile,
} from "../controllers/projectController";
import upload from "../middleware/upload";

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

// File routes
router.post("/projects/:id/files", upload.single("file"), uploadFile);
router.get("/projects/:id/files", listFiles);
router.get("/files/:fileId", downloadFile);
router.delete("/files/:fileId", deleteFile);


