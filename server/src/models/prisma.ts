/**
 * ================================================================
 * models/prisma.ts - Prisma Client Configuration
 * ================================================================
 * 
 * Manages the Prisma database client instance and connection lifecycle.
 * 
 * Exports:
 * - prisma: Singleton Prisma Client instance
 * - connectPrisma: Establishes database connection
 * - disconnectPrisma: Closes database connection
 * 
 * Note: The Prisma Client is auto-generated from schema.prisma
 */

// ================================================================
// IMPORTS
// ================================================================
import { PrismaClient } from "@prisma/client"

// ================================================================
// PRISMA CLIENT INSTANCE
// ================================================================
/**
 * Singleton Prisma Client instance
 * 
 * This client is used throughout the application to interact
 * with the PostgreSQL database. It provides type-safe database
 * access based on the schema definition.
 */
export const prisma = new PrismaClient()

// ================================================================
// CONNECTION MANAGEMENT
// ================================================================
/**
 * Connect to the database
 * 
 * Establishes a connection to PostgreSQL. This should be called
 * during server startup before handling any requests.
 * 
 * @throws Error if connection fails
 */
export async function connectPrisma(): Promise<void> {
  await prisma.$connect()
}

/**
 * Disconnect from the database
 * 
 * Gracefully closes all database connections. Should be called
 * during server shutdown to clean up resources.
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect()
}
