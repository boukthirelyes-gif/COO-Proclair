import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const db = new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
type Legacy = {clients:{id:number;name:string;email:string;company:string;status:string;notes:string}[];tasks:{id:number;title:string;due:string;done:number}[]};
let text = '';
for await (const chunk of process.stdin) text += chunk;
const data: Legacy = JSON.parse(text);
if (!Array.isArray(data.clients) || !Array.isArray(data.tasks)) throw new Error('Export SQLite invalide.');
try {
  const result = await db.$transaction(async tx => {
    let customers = 0, tasks = 0;
    for (const client of data.clients) {
      if (await tx.customer.findUnique({where:{legacyId:client.id}})) continue;
      await tx.customer.create({data:{legacyId:client.id,name:client.name,email:client.email||null,notes:client.notes,legacyCompany:client.company,legacyStatus:client.status,sourceSystem:'PROCLAIR_LEGACY'}});
      customers++;
    }
    for (const task of data.tasks) {
      if (await tx.legacyTask.findUnique({where:{legacyId:task.id}})) continue;
      await tx.legacyTask.create({data:{legacyId:task.id,title:task.title,due:task.due,done:!!task.done}});
      tasks++;
    }
    await tx.auditEvent.create({data:{actorId:'migration',actorRole:'ADMIN',action:'IMPORT_LEGACY',entityType:'Migration',entityId:'sqlite-v1',after:{customers,tasks,sourceCustomers:data.clients.length,sourceTasks:data.tasks.length}}});
    return {customers,tasks};
  });
  console.log('Migration legacy transactionnelle terminée', result);
} finally { await db.$disconnect(); }
