-- CreateIndex
CREATE INDEX "Project_listKind_createdAt_idx" ON "Project"("listKind", "createdAt");

-- CreateIndex
CREATE INDEX "Project_name_idx" ON "Project"("name");

-- CreateIndex
CREATE INDEX "Project_developer_idx" ON "Project"("developer");
