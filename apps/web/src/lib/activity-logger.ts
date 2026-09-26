import { db, activityLog } from '@ai-crm/db';

export async function logActivity(params: {
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  details?: any;
  before?: any;
  after?: any;
  ipAddress?: string;
}): Promise<void> {
  try {
    const id = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    db.insert(activityLog)
      .values({
        id,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        performedBy: params.performedBy,
        detailsJson: params.details ? JSON.stringify(params.details) : null,
        beforeJson: params.before ? JSON.stringify(params.before) : null,
        afterJson: params.after ? JSON.stringify(params.after) : null,
        ipAddress: params.ipAddress || null,
        createdAt: now,
      })
      .run();
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
}
