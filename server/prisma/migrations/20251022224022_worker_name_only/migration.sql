/*
  Warnings:

  - You are about to drop the column `email` on the `Worker` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Worker` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Worker" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);
INSERT INTO "new_Worker" ("id", "name") SELECT "id", "name" FROM "Worker";
DROP TABLE "Worker";
ALTER TABLE "new_Worker" RENAME TO "Worker";
CREATE UNIQUE INDEX "Worker_name_key" ON "Worker"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
