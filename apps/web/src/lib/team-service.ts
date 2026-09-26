import { db, users, sessions, projects, tasks, taskAssignments, projectMembers, userInvitations } from '@ai-crm/db';
import { eq, and, or, sql, desc, inArray } from 'drizzle-orm';
import { hashPassword, ProjectRole } from './auth';
import crypto from 'crypto';

export interface CreateUserInput {
  name: string;
  email: string;
  role?: 'admin' | 'operator';
  password?: string;
  createInviteToken?: boolean;
  createdBy: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: 'admin' | 'operator';
  status?: 'active' | 'inactive';
  password?: string;
}

export interface AddProjectMemberInput {
  projectId: string;
  userId: string;
  projectRole: ProjectRole;
  addedBy: string;
}

/**
 * Lists all users with their status, role, assigned projects count, and open tasks count.
 */
export function listTeamUsers(params?: { status?: 'active' | 'inactive' | 'all'; search?: string }) {
  let query = db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    status: users.status,
    avatar: users.avatar,
    invitedBy: users.invitedBy,
    activatedAt: users.activatedAt,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  }).from(users);

  const allUsers = query.all();

  // Filter in memory for flexibility
  let filtered = allUsers;
  if (params?.status && params.status !== 'all') {
    filtered = filtered.filter((u) => u.status === params.status);
  }

  if (params?.search && params.search.trim()) {
    const s = params.search.toLowerCase().trim();
    filtered = filtered.filter(
      (u) => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)
    );
  }

  // Enrich with projects count and open tasks count
  return filtered.map((u) => {
    const memberships = db
      .select({ id: projectMembers.id, projectId: projectMembers.projectId, projectRole: projectMembers.projectRole })
      .from(projectMembers)
      .where(and(eq(projectMembers.userId, u.id), eq(projectMembers.status, 'active')))
      .all();

    const openTasks = db
      .select({ id: tasks.id })
      .from(taskAssignments)
      .innerJoin(tasks, eq(taskAssignments.taskId, tasks.id))
      .where(
        and(
          eq(taskAssignments.userId, u.id),
          sql`${tasks.status} NOT IN ('completato', 'annullato')`
        )
      )
      .all();

    return {
      ...u,
      projectsCount: memberships.length,
      openTasksCount: openTasks.length,
      projectMemberships: memberships,
    };
  });
}

/**
 * Creates a new user (Admin only).
 * Can set initial temporary password or generate a one-time invitation token.
 */
export async function createUserByAdmin(input: CreateUserInput) {
  const cleanEmail = input.email.trim().toLowerCase();

  // Check email uniqueness
  const existing = db.select({ id: users.id }).from(users).where(eq(users.email, cleanEmail)).get();
  if (existing) {
    throw new Error('EMAIL_ALREADY_EXISTS');
  }

  const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const role = input.role || 'operator';

  let passwordHash = '';
  let status: 'active' | 'inactive' = 'active';
  let inviteToken: string | null = null;
  let inviteExpiresAt: string | null = null;

  if (input.createInviteToken) {
    // Generate random one-time secure token (valid 7 days)
    inviteToken = crypto.randomBytes(24).toString('hex');
    const exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    inviteExpiresAt = exp.toISOString();
    // Temporary random hash until activation
    passwordHash = await hashPassword(crypto.randomBytes(32).toString('hex'));
    status = 'active'; // active once activated, but already valid account
  } else if (input.password && input.password.trim()) {
    passwordHash = await hashPassword(input.password.trim());
  } else {
    throw new Error('PASSWORD_OR_INVITE_REQUIRED');
  }

  db.insert(users).values({
    id: userId,
    name: input.name.trim(),
    email: cleanEmail,
    passwordHash,
    role,
    status,
    invitedBy: input.createdBy,
    activatedAt: input.createInviteToken ? null : now,
    createdAt: now,
    updatedAt: now,
  }).run();

  if (inviteToken && inviteExpiresAt) {
    const inviteId = `inv_${crypto.randomBytes(8).toString('hex')}`;
    db.insert(userInvitations).values({
      id: inviteId,
      email: cleanEmail,
      name: input.name.trim(),
      role,
      token: inviteToken,
      expiresAt: inviteExpiresAt,
      usedAt: null,
      createdBy: input.createdBy,
      createdAt: now,
    }).run();
  }

  return {
    userId,
    name: input.name.trim(),
    email: cleanEmail,
    role,
    status,
    inviteToken,
    inviteExpiresAt,
  };
}

/**
 * Generates an invitation link/token for an existing or new user.
 */
export async function createInvitationToken(params: { email: string; name: string; role?: 'admin' | 'operator'; createdBy: string }) {
  const cleanEmail = params.email.trim().toLowerCase();
  const token = crypto.randomBytes(24).toString('hex');
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const inviteId = `inv_${crypto.randomBytes(8).toString('hex')}`;

  db.insert(userInvitations).values({
    id: inviteId,
    email: cleanEmail,
    name: params.name.trim(),
    role: params.role || 'operator',
    token,
    expiresAt,
    usedAt: null,
    createdBy: params.createdBy,
    createdAt: now,
  }).run();

  return {
    inviteId,
    email: cleanEmail,
    token,
    expiresAt,
  };
}

/**
 * Validates an invitation token.
 */
export function getInvitationByToken(token: string) {
  if (!token) return null;
  const invite = db.select().from(userInvitations).where(eq(userInvitations.token, token)).get();
  if (!invite) return null;

  if (invite.usedAt) {
    return { error: 'TOKEN_ALREADY_USED', invite };
  }

  const now = new Date();
  if (new Date(invite.expiresAt) < now) {
    return { error: 'TOKEN_EXPIRED', invite };
  }

  return { success: true, invite };
}

/**
 * Activates an account or completes invitation using the token.
 */
export async function activateUserInvitation(token: string, newPassword: string) {
  const check = getInvitationByToken(token);
  if (!check || check.error || !check.invite) {
    throw new Error(check?.error || 'INVALID_TOKEN');
  }

  const invite = check.invite;
  if (!newPassword || newPassword.length < 6) {
    throw new Error('PASSWORD_TOO_SHORT');
  }

  const newHash = await hashPassword(newPassword);
  const now = new Date().toISOString();

  // Find user by email
  let user = db.select().from(users).where(eq(users.email, invite.email)).get();

  if (user) {
    db.update(users)
      .set({
        passwordHash: newHash,
        status: 'active',
        activatedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, user.id))
      .run();
  } else {
    // Create new user if didn't exist yet
    const newUserId = `usr_${crypto.randomBytes(8).toString('hex')}`;
    db.insert(users).values({
      id: newUserId,
      name: invite.name,
      email: invite.email,
      passwordHash: newHash,
      role: invite.role,
      status: 'active',
      invitedBy: invite.createdBy,
      activatedAt: now,
      createdAt: now,
      updatedAt: now,
    }).run();
    user = db.select().from(users).where(eq(users.id, newUserId)).get()!;
  }

  // Mark invitation as used
  db.update(userInvitations)
    .set({ usedAt: now })
    .where(eq(userInvitations.id, invite.id))
    .run();

  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

/**
 * Updates a user profile, role, status or password.
 * If status is set to inactive, all active sessions are revoked immediately.
 */
export async function updateUser(userId: string, input: UpdateUserInput) {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const now = new Date().toISOString();
  const updates: any = { updatedAt: now };

  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.email !== undefined) {
    const cleanEmail = input.email.trim().toLowerCase();
    if (cleanEmail !== user.email) {
      const existing = db.select().from(users).where(eq(users.email, cleanEmail)).get();
      if (existing && existing.id !== userId) {
        throw new Error('EMAIL_ALREADY_EXISTS');
      }
      updates.email = cleanEmail;
    }
  }
  if (input.role !== undefined) updates.role = input.role;
  if (input.status !== undefined) updates.status = input.status;
  if (input.password && input.password.trim()) {
    updates.passwordHash = await hashPassword(input.password.trim());
  }

  db.update(users).set(updates).where(eq(users.id, userId)).run();

  // If user is deactivated, immediately purge any sessions from sessions table
  if (input.status === 'inactive') {
    db.delete(sessions).where(eq(sessions.userId, userId)).run();
  }

  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    status: users.status,
    avatar: users.avatar,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  }).from(users).where(eq(users.id, userId)).get()!;
}

/**
 * Retrieves projects assigned to a user.
 */
export function getUserProjects(userId: string) {
  return db
    .select({
      membershipId: projectMembers.id,
      projectId: projects.id,
      projectCode: projects.code,
      projectTitle: projects.title,
      projectStatus: projects.status,
      projectType: projects.projectType,
      projectRole: projectMembers.projectRole,
      membershipStatus: projectMembers.status,
      joinedAt: projectMembers.joinedAt,
    })
    .from(projectMembers)
    .innerJoin(projects, eq(projectMembers.projectId, projects.id))
    .where(and(eq(projectMembers.userId, userId), eq(projectMembers.status, 'active')))
    .all();
}

/**
 * Retrieves members of a specific project.
 */
export function getProjectMembers(projectId: string) {
  const members = db
    .select({
      id: projectMembers.id,
      projectId: projectMembers.projectId,
      userId: projectMembers.userId,
      projectRole: projectMembers.projectRole,
      status: projectMembers.status,
      joinedAt: projectMembers.joinedAt,
      addedBy: projectMembers.addedBy,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
      userStatus: users.status,
      userAvatar: users.avatar,
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.status, 'active')))
    .all();

  // Calculate open tasks count for each member in this project
  return members.map((m) => {
    const openTasks = db
      .select({ id: tasks.id, title: tasks.title, status: tasks.status })
      .from(taskAssignments)
      .innerJoin(tasks, eq(taskAssignments.taskId, tasks.id))
      .where(
        and(
          eq(tasks.projectId, projectId),
          eq(taskAssignments.userId, m.userId),
          sql`${tasks.status} NOT IN ('completato', 'annullato')`
        )
      )
      .all();

    return {
      ...m,
      openTasksCount: openTasks.length,
      openTasks,
    };
  });
}

/**
 * Adds a user to a project team.
 */
export function addProjectMember(input: AddProjectMemberInput) {
  const project = db.select({ id: projects.id }).from(projects).where(eq(projects.id, input.projectId)).get();
  if (!project) throw new Error('PROJECT_NOT_FOUND');

  const user = db.select({ id: users.id, status: users.status }).from(users).where(eq(users.id, input.userId)).get();
  if (!user) throw new Error('USER_NOT_FOUND');
  if (user.status === 'inactive') throw new Error('CANNOT_ADD_INACTIVE_USER');

  const existing = db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, input.projectId), eq(projectMembers.userId, input.userId)))
    .get();

  const now = new Date().toISOString();

  if (existing) {
    if (existing.status === 'active') {
      // Update role if already active
      db.update(projectMembers)
        .set({ projectRole: input.projectRole })
        .where(eq(projectMembers.id, existing.id))
        .run();
      return { ...existing, projectRole: input.projectRole };
    } else {
      // Reactivate membership
      db.update(projectMembers)
        .set({
          projectRole: input.projectRole,
          status: 'active',
          joinedAt: now,
          addedBy: input.addedBy,
        })
        .where(eq(projectMembers.id, existing.id))
        .run();
      return { ...existing, projectRole: input.projectRole, status: 'active', joinedAt: now };
    }
  }

  const memberId = `pm_${input.projectId}_${input.userId}`;
  db.insert(projectMembers).values({
    id: memberId,
    projectId: input.projectId,
    userId: input.userId,
    projectRole: input.projectRole,
    status: 'active',
    joinedAt: now,
    addedBy: input.addedBy,
  }).run();

  return db.select().from(projectMembers).where(eq(projectMembers.id, memberId)).get()!;
}

/**
 * Updates a member's role in a project.
 */
export function updateProjectMemberRole(projectId: string, userId: string, projectRole: ProjectRole) {
  const member = db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .get();

  if (!member || member.status !== 'active') {
    throw new Error('MEMBER_NOT_FOUND');
  }

  db.update(projectMembers)
    .set({ projectRole })
    .where(eq(projectMembers.id, member.id))
    .run();

  return { ...member, projectRole };
}

/**
 * Removes a member from a project team.
 * If user has open tasks in this project, returns warning / blocks unless force is true.
 */
export function removeProjectMember(projectId: string, userId: string, force: boolean = false) {
  const member = db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .get();

  if (!member || member.status !== 'active') {
    throw new Error('MEMBER_NOT_FOUND');
  }

  // Check for open tasks assigned to this user in this project
  const openTasks = db
    .select({ id: tasks.id, title: tasks.title, status: tasks.status })
    .from(taskAssignments)
    .innerJoin(tasks, eq(taskAssignments.taskId, tasks.id))
    .where(
      and(
        eq(tasks.projectId, projectId),
        eq(taskAssignments.userId, userId),
        sql`${tasks.status} NOT IN ('completato', 'annullato')`
      )
    )
    .all();

  if (openTasks.length > 0 && !force) {
    return {
      success: false,
      hasOpenTasks: true,
      openTasksCount: openTasks.length,
      openTasks,
      message: `L'utente ha ${openTasks.length} task aperti in questo progetto. Riassegna o chiudi i task prima di rimuoverlo, oppure forza la rimozione.`,
    };
  }

  // If force removal, unassign user from open tasks in this project
  if (force && openTasks.length > 0) {
    const taskIds = openTasks.map((t) => t.id);
    db.delete(taskAssignments)
      .where(and(eq(taskAssignments.userId, userId), inArray(taskAssignments.taskId, taskIds)))
      .run();
  }

  // Delete project membership
  db.delete(projectMembers).where(eq(projectMembers.id, member.id)).run();

  return {
    success: true,
    hasOpenTasks: false,
    removedUserId: userId,
  };
}

/**
 * Returns users available for task assignment in a project.
 * ONLY active project members can be selected.
 */
export function getAvailableTaskAssignees(projectId: string) {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatar: users.avatar,
      projectRole: projectMembers.projectRole,
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.status, 'active'),
        eq(users.status, 'active')
      )
    )
    .all();
}
