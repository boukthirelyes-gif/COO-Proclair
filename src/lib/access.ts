import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import type {PrismaClient} from '@prisma/client';
import {z} from 'zod';
import type {Actor} from '../domain/rules';
import {DomainError} from '../domain/rules';
export const permissions=['crm.read','crm.write','dispatch','finance','quotes','omega','map.read','map.write','map.all','users','settings','integrations','export','audit','leads.read','leads.write','leads.all'] as const;
export type Permission=typeof permissions[number];
export const presets:Record<string,Permission[]>={
 ADMIN:[...permissions],MANAGER:['crm.read','crm.write','dispatch','finance','quotes','omega','map.read','map.write','map.all','leads.read','leads.write','leads.all'],
 DISPATCHER:['crm.read','dispatch','omega','map.read'],SELLER:['map.read','map.write','leads.read','leads.write'],VIEWER:['crm.read','map.read','leads.read'],
};
export type AccessActor=Actor & {accountRole:string;name:string;permissions:Permission[];sessionVersion:number};
export const bootstrapActor:AccessActor={id:'admin',role:'ADMIN',accountRole:'ADMIN',name:'Administrateur principal',permissions:[...permissions],sessionVersion:0};
export function requirePermission(actor:AccessActor,permission:Permission){if(!actor.permissions.includes(permission))throw new DomainError('FORBIDDEN','Vous ne disposez pas de cette autorisation.',403);}
export function userActor(user:{id:string;name:string;role:string;permissions:string[];sessionVersion:number}):AccessActor {
 return {id:user.id,name:user.name,accountRole:user.role,role:user.role==='ADMIN'?'ADMIN':['MANAGER','DISPATCHER'].includes(user.role)?'DISPATCHER':'VIEWER',permissions:(user.permissions.filter(p=>presets[user.role]?.includes(p as Permission)) as Permission[]),sessionVersion:user.sessionVersion};
}
export function hashPassword(password:string){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64).toString('hex');}
export function verifyPassword(password:string,stored:string){const [salt,digest]=stored.split(':');const actual=scryptSync(password,salt||'unknown-user',64);const expected=Buffer.from(digest||'00'.repeat(64),'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected);}
const publicSelect={id:true,username:true,name:true,role:true,permissions:true,active:true,version:true,createdAt:true} as const;
const fields=z.object({username:z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._@-]{2,99}$/).refine(v=>v!=='admin','Identifiant réservé.'),name:z.string().trim().min(1).max(200),role:z.enum(['ADMIN','MANAGER','DISPATCHER','SELLER','VIEWER']),permissions:z.array(z.enum(permissions)).max(permissions.length),active:z.boolean().default(true)}).strict().superRefine((data,ctx)=>{if(data.permissions.some(p=>!presets[data.role].includes(p)))ctx.addIssue({code:'custom',message:'Autorisation incompatible avec le rôle.'});if(data.role==='ADMIN'&&permissions.some(p=>!data.permissions.includes(p)))ctx.addIssue({code:'custom',message:'Un administrateur conserve toutes les autorisations.'});if((data.permissions.includes('map.write')||data.permissions.includes('map.all'))&&!data.permissions.includes('map.read'))ctx.addIssue({code:'custom',message:'La modification de la carte nécessite sa consultation.'});if((data.permissions.includes('leads.write')||data.permissions.includes('leads.all'))&&!data.permissions.includes('leads.read'))ctx.addIssue({code:'custom',message:'La gestion des prospects nécessite leur consultation.'});if(['crm.write','dispatch','quotes','finance','omega'].some(p=>data.permissions.includes(p as Permission))&&!data.permissions.includes('crm.read'))ctx.addIssue({code:'custom',message:'La gestion nécessite la consultation du CRM.'});});
const password=z.string().min(12).max(256);
export class UserService {
 constructor(public db:PrismaClient){}
 async list(actor:AccessActor){requirePermission(actor,'users');return this.db.appUser.findMany({select:publicSelect,orderBy:{name:'asc'}})}
 async create(input:unknown,actor:AccessActor){requirePermission(actor,'users');const v=z.object({username:z.unknown(),name:z.unknown(),role:z.unknown(),permissions:z.unknown(),active:z.unknown().optional(),password}).strict().parse(input),data=fields.parse({username:v.username,name:v.name,role:v.role,permissions:v.permissions,...(v.active!==undefined?{active:v.active}:{})});return this.db.$transaction(async tx=>{const row=await tx.appUser.create({data:{...data,passwordHash:hashPassword(v.password)},select:publicSelect});await tx.auditEvent.create({data:{actorId:actor.id,actorRole:actor.role,action:'USER_CREATED',entityType:'AppUser',entityId:row.id,after:JSON.parse(JSON.stringify(row))}});return row})}
 async update(id:string,input:unknown,actor:AccessActor){requirePermission(actor,'users');const raw=z.object({expectedVersion:z.number().int().positive(),username:z.unknown(),name:z.unknown(),role:z.unknown(),permissions:z.unknown(),active:z.unknown(),password:password.optional()}).strict().parse(input),data=fields.parse({username:raw.username,name:raw.name,role:raw.role,permissions:raw.permissions,active:raw.active});return this.db.$transaction(async tx=>{
 await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928357)`;
 const before=await tx.appUser.findUnique({where:{id},select:publicSelect});if(!before)throw new DomainError('NOT_FOUND','Utilisateur introuvable.',404);if(before.version!==raw.expectedVersion)throw new DomainError('VERSION_CONFLICT','Ce compte a changé. Actualisez-le.',409);
 if(id===actor.id&&(!data.active||data.role!=='ADMIN'))throw new DomainError('SELF_LOCKOUT','Vous ne pouvez pas retirer votre propre accès administrateur.',409);
 const row=await tx.appUser.update({where:{id,version:raw.expectedVersion},data:{...data,...(raw.password?{passwordHash:hashPassword(raw.password)}:{}),version:{increment:1},sessionVersion:{increment:1}},select:publicSelect});await tx.auditEvent.create({data:{actorId:actor.id,actorRole:actor.role,action:'USER_UPDATED',entityType:'AppUser',entityId:id,before:JSON.parse(JSON.stringify(before)),after:JSON.parse(JSON.stringify(row))}});return row;
 })}
}
// Every authenticated route has an explicit grant. Unknown routes default to denial.
export function routePermission(path:string,method:string):Permission|null {
 if(path==='agreements/options')return 'crm.write';
 if(path==='agreements'||path.startsWith('agreements/'))return method==='GET'?'crm.read':path.endsWith('/schedule')?'dispatch':'crm.write';
 if(path==='dashboard/metrics')return 'crm.read';
 if(path==='search')return null;
 if(path==='session'||path==='session/logout'||path==='state')return null;
 if(path==='leads'||path.startsWith('leads/'))return method==='GET'?'leads.read':'leads.write';
 if(path==='users'||path.startsWith('users/'))return 'users';
 if(path==='territories'||path.startsWith('territories/'))return method==='GET'?'map.read':'map.all';
 if(path==='prospecting'||path.startsWith('prospecting/'))return method==='GET'?'map.read':'map.write';
 if(path.startsWith('system/'))return 'integrations';
 if(path==='settings/business')return 'settings';
 if(path==='export/native')return 'export';
 if(path.startsWith('integrations/'))return 'integrations';
 if(path.startsWith('omega/')||path.startsWith('worker/'))return 'omega';
 if(path==='quotes'||path.startsWith('quotes/'))return path.endsWith('/convert')?'finance':'quotes';
 if(path.startsWith('portal/'))return 'settings';
 if(path.startsWith('finance/')||/^(invoices|payments|expenses)(\/|$)/.test(path))return 'finance';
 if(/^(customers|properties|contracts|jobs|visits)(\/|$)/.test(path))return method==='GET'?'crm.read':path.startsWith('visits')?'dispatch':'crm.write';
 throw new DomainError('FORBIDDEN','Route non autorisée.',403);
}
