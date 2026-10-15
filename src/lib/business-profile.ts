import {z} from 'zod';
import {businessHoursSchema} from './business-hours';
import type {PrismaClient} from '@prisma/client';
import {DomainError,type Actor} from '@/domain/rules';
const optional=(max:number)=>z.string().trim().max(max).nullable().optional().transform(v=>v||null);
const detail=(max:number)=>z.string().trim().max(max).nullable().transform(v=>v||null).optional();
const website=z.string().trim().max(2048).refine(value=>{if(!value)return true;try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password}catch{return false}},'Utilisez une adresse HTTP ou HTTPS sans identifiants.').nullable().transform(v=>v||null).optional();
const schema=z.object({expectedVersion:z.number().int().min(0),legalName:z.string().trim().min(1).max(200),address:optional(1000),email:z.union([z.string().trim().email(),z.literal(''),z.null()]).optional().transform(v=>v||null),phone:optional(80),taxInformation:optional(2000),businessHours:businessHoursSchema.optional(),internalName:detail(200),description:detail(160),website}).strict();
export async function saveBusinessProfile(db:PrismaClient,input:unknown,actor:Actor){
 if(actor.role!=='ADMIN'||!actor.id)throw new DomainError('FORBIDDEN','Configuration réservée à un administrateur.',403);
 const {expectedVersion,...fields}=schema.parse(input);
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928355)`;
  const before=await tx.businessProfile.findUnique({where:{id:'proclair'}});if((before?.version??0)!==expectedVersion)throw new DomainError('VERSION_CONFLICT','La fiche entreprise a changé. Actualisez-la.',409);
  const row=before?await tx.businessProfile.update({where:{id:'proclair',version:expectedVersion},data:{...fields,version:{increment:1}}}):await tx.businessProfile.create({data:{id:'proclair',...fields}});
  await tx.auditEvent.create({data:{actorId:actor.id,actorRole:actor.role,action:'BUSINESS_PROFILE_UPDATED',entityType:'BusinessProfile',entityId:'proclair',...(before?{before:JSON.parse(JSON.stringify(before))}:{}),after:JSON.parse(JSON.stringify(row))}});return row;
 });
}
