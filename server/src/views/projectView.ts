import { Assignment, Project } from "@prisma/client";

type ProjectWithAssignments = Project & { assignments: Assignment[] };

export function shapeProjectList(items: ProjectWithAssignments[]) {
  return items.map((p) => {
    const last = p.assignments[0];
    return {
      id: p.id,
      name: p.name,
      developer: p.developer ?? null,
      status: p.status,
      scopeValue: p.scopeValue ?? null,
      units: p.units ?? null,
      standard: p.standard ?? null,
      execution: p.execution ?? null,
      remaining: p.remaining ?? null,
      startDate: p.startDate ?? null,
      lastTaskTitle: last?.title ?? null,
      lastHandlerName: last?.assigneeName ?? null,
      lastTaskDate: (last?.dueDate ?? last?.createdAt) ?? null,
      createdAt: p.createdAt,
    };
  });
}


