import { db, tasks, taskDependencies, projects } from '@ai-crm/db';
import { eq, and } from 'drizzle-orm';

/**
 * Checks whether adding a directed dependency (predecessorId -> successorId) would introduce a cycle.
 * Returns true if a cycle WOULD be created (i.e. invalid), false if safe.
 */
export function wouldCreateDependencyCycle(
  predecessorTaskId: string,
  successorTaskId: string
): boolean {
  if (predecessorTaskId === successorTaskId) {
    return true; // Self-dependency is a cycle
  }

  // Fetch all existing dependencies
  const allDeps = db.select().from(taskDependencies).all();

  // Build adjacency list: node -> list of successors
  const adj = new Map<string, string[]>();
  for (const dep of allDeps) {
    if (!adj.has(dep.predecessorTaskId)) {
      adj.set(dep.predecessorTaskId, []);
    }
    adj.get(dep.predecessorTaskId)!.push(dep.successorTaskId);
  }

  // Add proposed edge
  if (!adj.has(predecessorTaskId)) {
    adj.set(predecessorTaskId, []);
  }
  adj.get(predecessorTaskId)!.push(successorTaskId);

  // Check if predecessorTaskId is reachable starting from successorTaskId (DFS)
  const visited = new Set<string>();
  const stack = [successorTaskId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === predecessorTaskId) {
      return true; // Cycle detected!
    }
    if (!visited.has(current)) {
      visited.add(current);
      const neighbors = adj.get(current) || [];
      for (const next of neighbors) {
        stack.push(next);
      }
    }
  }

  return false;
}

/**
 * Checks if a task is blocked by unfinished predecessors.
 */
export function isTaskBlocked(taskId: string): boolean {
  const deps = db
    .select()
    .from(taskDependencies)
    .where(eq(taskDependencies.successorTaskId, taskId))
    .all();

  if (deps.length === 0) return false;

  for (const dep of deps) {
    const pred = db.select().from(tasks).where(eq(tasks.id, dep.predecessorTaskId)).get();
    if (pred && pred.status !== 'completato') {
      return true;
    }
  }

  return false;
}

/**
 * Automatically recalculates and updates the project's progress percentage
 * based on the completion percentage of all tasks in the project.
 */
export function recalculateProjectProgress(projectId: string): number {
  const projectTasks = db.select().from(tasks).where(eq(tasks.projectId, projectId)).all();

  if (projectTasks.length === 0) {
    return 0;
  }

  const totalProgress = projectTasks.reduce((sum, t) => {
    if (t.status === 'completato') return sum + 100;
    return sum + (t.progressPercent || 0);
  }, 0);

  const avgProgress = Math.round(totalProgress / projectTasks.length);

  try {
    db.update(projects)
      .set({
        progressPercent: avgProgress,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(projects.id, projectId))
      .run();
  } catch (err) {
    console.error('Failed to update project progress:', err);
  }

  return avgProgress;
}
