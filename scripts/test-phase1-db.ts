import {
  db,
  users,
  leads,
  quotes,
  quoteVersions,
  quoteItems,
  approvals,
  orders,
  projects,
  projectMilestones,
  tasks,
  taskAssignments,
  taskDependencies,
  documents,
  activityLog,
  initDatabase
} from '../packages/db/src/index';

async function testDb() {
  console.log('Running initDatabase()...');
  initDatabase();

  console.log('Checking table queries...');
  const u = db.select().from(users).all();
  const l = db.select().from(leads).all();
  const q = db.select().from(quotes).all();
  const qv = db.select().from(quoteVersions).all();
  const qi = db.select().from(quoteItems).all();
  const app = db.select().from(approvals).all();
  const ord = db.select().from(orders).all();
  const prj = db.select().from(projects).all();
  const mls = db.select().from(projectMilestones).all();
  const tsk = db.select().from(tasks).all();
  const ta = db.select().from(taskAssignments).all();
  const td = db.select().from(taskDependencies).all();
  const doc = db.select().from(documents).all();
  const act = db.select().from(activityLog).all();

  console.log('✅ ALL 12 new tables exist and can be queried via Drizzle ORM!');
  console.log({
    usersCount: u.length,
    leadsCount: l.length,
    quotesCount: q.length,
    quoteVersionsCount: qv.length,
    quoteItemsCount: qi.length,
    approvalsCount: app.length,
    ordersCount: ord.length,
    projectsCount: prj.length,
    milestonesCount: mls.length,
    tasksCount: tsk.length,
    taskAssignmentsCount: ta.length,
    taskDependenciesCount: td.length,
    documentsCount: doc.length,
    activityLogCount: act.length,
  });
}

testDb().catch(err => {
  console.error('❌ DB Test failed:', err);
  process.exit(1);
});
