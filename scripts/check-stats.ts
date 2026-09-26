import { db, projects, projectMembers, users } from '@ai-crm/db';

const allProjects = db.select().from(projects).all();
const allMembers = db.select().from(projectMembers).all();
const allUsers = db.select().from(users).all();

console.log('--- STATISTICHE DATABASE ---');
console.log('Totale Utenti:', allUsers.length);
console.log('Totale Progetti:', allProjects.length);
console.log('Totale Record Membri di Progetto:', allMembers.length);

let withoutTeam = 0;
for (const p of allProjects) {
  const count = allMembers.filter((m) => m.projectId === p.id && m.status === 'active').length;
  if (count === 0) {
    withoutTeam++;
    console.log('  Progetto privo di team:', p.id, p.code, p.title);
  }
}
console.log('Progetti privi di team assegnato:', withoutTeam);
