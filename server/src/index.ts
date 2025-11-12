/**
 * ================================================================
 * index.ts - Server Entry Point
 * ================================================================
 * 
 * Main entry point for the Express/Node.js backend server.
 * 
 * Responsibilities:
 * - Initialize Express application
 * - Configure middleware (CORS, JSON parsing)
 * - Connect to database via Prisma
 * - Mount API routes
 * - Start HTTP server
 * 
 * Environment Variables:
 * - PORT: Server port (default: 4000)
 * - DATABASE_URL: PostgreSQL connection string
 */

// ================================================================
// IMPORTS
// ================================================================
import express from "express"
import cors from "cors"
import { connectPrisma } from "./models/prisma"
import { router as apiRouter } from "./routes/projects"

// ================================================================
// EXPRESS APPLICATION SETUP
// ================================================================
const app = express()

// Enable CORS for all origins
app.use(cors())

// Parse JSON request bodies
app.use(express.json())

// Mount API routes under /api prefix
app.use("/api", apiRouter)

// ================================================================
// CONFIGURATION
// ================================================================
const PORT = Number(process.env.PORT) || 4000

// ================================================================
// SERVER STARTUP
// ================================================================
/**
 * Main startup function
 * 
 * Steps:
 * 1. Connect to database via Prisma
 * 2. Start Express server on specified port
 * 3. Handle fatal errors with process exit
 */
async function main() {
  try {
    console.log("[server] booting…")
    
    // Connect to PostgreSQL database
    await connectPrisma()
    console.log("[server] prisma connected")
    
    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`[server] listening at http://localhost:${PORT}`)
    })
  } catch (err) {
    console.error("[server] FATAL during boot:", err)
    process.exit(1)
  }
}

// Start the server
main()
