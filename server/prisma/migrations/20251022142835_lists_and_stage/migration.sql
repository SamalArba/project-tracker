/*
  Warnings:

  - You are about to drop the column `clientName` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Project` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "developer" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'CREATED',
    "listKind" TEXT NOT NULL DEFAULT 'NEGOTIATION',
    "standard" TEXT,
    "units" INTEGER,
    "scopeValue" TEXT,
    "startDate" DATETIME,
    "execution" INTEGER,
    "remaining" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Project" ("createdAt", "id", "name", "updatedAt") SELECT "createdAt", "id", "name", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
