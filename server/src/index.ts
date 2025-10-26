import express from "express";
import cors from "cors";
import routes from "./routes";
import { PrismaClient } from "@prisma/client";

const app = express();
app.use(cors());
app.use(express.json());
app.use(routes); // delegate routes

const prisma = new PrismaClient();
const PORT = Number(process.env.PORT) || 4000;
async function main() {
  try {
    console.log("[server] booting…");
    await prisma.$connect();
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
