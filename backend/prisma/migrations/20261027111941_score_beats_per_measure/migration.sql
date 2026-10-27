/*
  Warnings:

  - Added the required column `beatsPerMeasure` to the `Score` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Score" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "composer" TEXT,
    "tempoBpm" INTEGER NOT NULL,
    "beatsPerMeasure" REAL NOT NULL,
    "measures" INTEGER NOT NULL,
    "notesJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Score" ("composer", "createdAt", "id", "measures", "notesJson", "tempoBpm", "title") SELECT "composer", "createdAt", "id", "measures", "notesJson", "tempoBpm", "title" FROM "Score";
DROP TABLE "Score";
ALTER TABLE "new_Score" RENAME TO "Score";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
