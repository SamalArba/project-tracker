import express from "express";
import cors from "cors";
import { connectPrisma } from "./models/prisma";
import { router as apiRouter } from "./routes/projects";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", apiRouter);

const PORT = Number(process.env.PORT) || 4000;

async function main() {
  try {
    console.log("[server] booting…");
    await connectPrisma();
    console.log("[server] prisma connected");
    app.listen(PORT, () => {
      console.log(`[server] listening at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("[server] FATAL during boot:", err);
    process.exit(1);
  }
}

main();
