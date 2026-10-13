import type {PrismaClient} from '@prisma/client';
import {Prisma} from '@prisma/client';
import {DomainError} from '@/domain/rules';
export async function nativeExport(db:PrismaClient){
 return db.$transaction(async tx=>{
  const data={businessProfiles:await tx.businessProfile.findMany({take:10001}),
   customers:await tx.customer.findMany({take:10001}),properties:await tx.property.findMany({take:10001}),contracts:await tx.contract.findMany({take:10001}),jobs:await tx.job.findMany({take:10001}),visits:await tx.visit.findMany({take:10001}),technicians:await tx.technician.findMany({take:10001}),quotes:await tx.quote.findMany({take:10001}),invoices:await tx.invoice.findMany({take:10001}),invoiceItems:await tx.invoiceItem.findMany({take:10001}),payments:await tx.payment.findMany({take:10001}),paymentReversals:await tx.paymentReversal.findMany({take:10001}),expenses:await tx.expense.findMany({take:10001}),legacyTasks:await tx.legacyTask.findMany({take:10001}),auditEvents:await tx.auditEvent.findMany({take:10001}),omegaPlans:await tx.omegaPlan.findMany({take:10001}),workerJobs:await tx.workerJob.findMany({take:10001}),rotorMirrorRecords:await tx.rotorMirrorRecord.findMany({take:10001}),
  };
  if(Object.values(data).some(rows=>rows.length>10000))throw new DomainError('EXPORT_TOO_LARGE','Le volume exige une sauvegarde PostgreSQL. Aucun export partiel généré.',413);
  const document={format:'PROCLAIR_BUSINESS_EXPORT',version:1,exportedAt:new Date().toISOString(),counts:Object.fromEntries(Object.entries(data).map(([name,rows])=>[name,rows.length])),data};
  const body=JSON.stringify(document,null,2);if(Buffer.byteLength(body)>4000000)throw new DomainError('EXPORT_TOO_LARGE','Le fichier dépasse la limite du téléchargement. Utilisez la sauvegarde PostgreSQL.',413);return body;
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,timeout:20000});
}
