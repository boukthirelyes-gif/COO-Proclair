import type {PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {bootstrapActor,requirePermission,type AccessActor} from './access';
import {DomainError} from '../domain/rules';
import {rotorTools,rotorStatus} from './rotor';
import {RotorCapabilityRegistry} from './rotor-capabilities';
export class RotorMonitor {
 constructor(public db:PrismaClient,public discover=rotorTools){}
 async configure(input:unknown,actor:AccessActor){requirePermission(actor,'integrations');const {enabled}=z.object({enabled:z.boolean()}).strict().parse(input);return this.db.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928359)`;const row=await tx.rotorMonitorControl.upsert({where:{id:'rotor-compatibility'},create:{id:'rotor-compatibility',enabled},update:{enabled}});await tx.auditEvent.create({data:{actorId:actor.id,actorRole:actor.accountRole,action:enabled?'ROTOR_MONITOR_ENABLED':'ROTOR_MONITOR_DISABLED',entityType:'RotorMonitorControl',entityId:row.id,after:{enabled,mode:'READ_ONLY_DISCOVERY'}}});return row})}
 async tick(now=new Date()){
 const claimed=await this.db.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928359)`;const c=await tx.rotorMonitorControl.findUnique({where:{id:'rotor-compatibility'}});if(!c?.enabled||(c.leaseUntil&&c.leaseUntil>now)||(c.nextCheckAt&&c.nextCheckAt>now))return false;await tx.rotorMonitorControl.update({where:{id:c.id},data:{leaseUntil:new Date(now.getTime()+120000)}});return true});if(!claimed)return {checked:false};
 try{const discovery=await this.discover();await new RotorCapabilityRegistry(this.db).record(discovery,{...bootstrapActor,id:'rotor-compatibility-monitor',name:'Surveillance Rotor'});await this.finish(now,'OK');return {checked:true,tools:discovery.tools.length,complete:!discovery.hasMore}}catch(error){const code=error instanceof DomainError?error.code:'ROTOR_MONITOR_FAILED';await this.finish(now,code);return {checked:true,errorCode:code}}
 }
 private finish(now:Date,lastCode:string){return this.db.rotorMonitorControl.update({where:{id:'rotor-compatibility'},data:{leaseUntil:null,lastCheckedAt:now,lastCode,nextCheckAt:new Date(now.getTime()+(lastCode==='OK'?86400000:3600000))}})}
}
