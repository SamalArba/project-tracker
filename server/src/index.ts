import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "server", ts: new Date().toISOString() });
});

const PORT = process.env.PORT || 4000;

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

app.get('/api/projects', async (_req, res) => {
  const items = await prisma.project.findMany({ orderBy: { createdAt: 'desc' } })
  res.json(items)
})

app.post('/api/projects', async (req, res) => {
  const { name, clientName, notes } = req.body || {}
  if (!name) return res.status(400).json({ error: 'name is required' })

  const created = await prisma.project.create({
    data: { name, clientName, notes }
  })
  res.status(201).json(created)
})


app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
