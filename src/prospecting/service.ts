import {z} from 'zod';
import {Prisma,type PrismaClient} from '@prisma/client';
import {DomainError} from '../domain/rules';
import {requirePermission,type AccessActor} from '../lib/access';
export const pinStatuses=['SOLD','NO_HOME','NOT_INTERESTED','CALLBACK','NOT_KNOCKED','FOLLOW_UP','ACTIVE','CANCELLED','DO_NOT_CONTACT'] as const;
const fields=z.object({address:z.string().trim().min(1).max(1000),latitude:z.number().finite().min(-90).max(90),longitude:z.number().finite().min(-180).max(180),status:z.enum(pinStatuses).default('NOT_KNOCKED'),notes:z.string().trim().max(5000).default(''),callbackAt:z.string().datetime({offset:true}).nullable().default(null),ownerId:z.string().min(1).max(100).nullable().default(null),typeId:z.string().min(1).max(100).nullable().optional()}).strict();
const include={type:true,owner:{select:{id:true,name:true}}};
const scope=(actor:AccessActor)=>actor.permissions.includes('map.all')?{}:{ownerId:actor.id};
export class ProspectingService {
 constructor(public db:PrismaClient){}
 async list(actor:AccessActor){requirePermission(actor,'map.read');const pins=await this.db.prospectPin.findMany({where:scope(actor),include,orderBy:{updatedAt:'desc'},take:2001});if(pins.length>2000)throw new DomainError('MAP_TOO_LARGE','La carte dépasse 2 000 portes. Une segmentation de territoire est nécessaire.',413);
 const sellers=actor.permissions.includes('map.all')?await this.db.appUser.findMany({where:{active:true,permissions:{has:'map.read'}},select:{id:true,name:true},orderBy:{name:'asc'}}):[{id:actor.id,name:actor.name}];if(Buffer.byteLength(JSON.stringify(pins))>3500000)throw new DomainError('MAP_TOO_LARGE','Le volume des notes nécessite une segmentation de la carte.',413);const types=await this.db.mapPinType.findMany({where:{active:true},orderBy:{position:'asc'}});return {pins,sellers,types,canReadRotor:actor.permissions.includes('integrations'),canManageAll:actor.permissions.includes('map.all'),canWrite:actor.permissions.includes('map.write'),actorId:actor.id};}
 async save(id:string|null,input:unknown,actor:AccessActor){requirePermission(actor,'map.write');const raw=id?fields.extend({expectedVersion:z.number().int().positive()}).parse(input):fields.parse(input),{expectedVersion,...values}=raw as z.infer<typeof fields>&{expectedVersion?:number};
 if(!actor.permissions.includes('map.all')&&values.ownerId!==actor.id&&values.ownerId!==null)throw new DomainError('FORBIDDEN','Affectation réservée au gestionnaire.',403);
 const ownerId=actor.permissions.includes('map.all')?values.ownerId:actor.id;
 if(values.status==='CALLBACK'&&!values.callbackAt)throw new DomainError('CALLBACK_REQUIRED','Indiquez la date du rappel.');
 if(values.status==='DO_NOT_CONTACT'&&values.callbackAt)throw new DomainError('DO_NOT_CONTACT','Une porte à ne pas contacter ne peut avoir de rappel.');
 return this.db.$transaction(async tx=>{
 if(ownerId){const owner=await tx.appUser.findUnique({where:{id:ownerId}});if(!owner?.active||!owner.permissions.includes('map.read'))throw new DomainError('INVALID_OWNER','Choisissez un utilisateur actif autorisé à consulter la carte.');}
 const before=id?await tx.prospectPin.findFirst({where:{id,...scope(actor)}}):null;
 if(id&&!before)throw new DomainError('NOT_FOUND','Porte introuvable.',404);
 if(before&&before.version!==expectedVersion)throw new DomainError('VERSION_CONFLICT','Cette porte a changé. Actualisez-la.',409);
 if(before?.status==='DO_NOT_CONTACT'&&values.status!=='DO_NOT_CONTACT'&&(actor.accountRole!=='ADMIN'||values.notes.trim().length<3))throw new DomainError('DO_NOT_CONTACT','Seul un administrateur peut lever cette restriction avec une note justificative.',403);
 const chosenId=values.typeId===undefined?(before?.status==='DO_NOT_CONTACT'&&values.status!=='DO_NOT_CONTACT'?null:before?.typeId):values.typeId;const type=chosenId?await tx.mapPinType.findUnique({where:{id:chosenId}}):null;if(chosenId&&!type?.active)throw new DomainError('INVALID_PIN_TYPE','Catégorie de pin indisponible.');const beforeType=before?.typeId?await tx.mapPinType.findUnique({where:{id:before.typeId}}):null;if(beforeType?.restricted&&!type?.restricted&&(actor.accountRole!=='ADMIN'||values.notes.trim().length<3))throw new DomainError('DO_NOT_CONTACT','Seul un administrateur peut lever Never Knock avec une justification.',403);if(type?.restricted&&values.callbackAt)throw new DomainError('DO_NOT_CONTACT','Never Knock interdit tout rappel.');const restrictedType=values.status==='DO_NOT_CONTACT'?await tx.mapPinType.findFirst({where:{restricted:true}}):null;const data={...values,typeId:restrictedType?.id??chosenId??null,status:type?.restricted?'DO_NOT_CONTACT':values.status,ownerId,callbackAt:values.callbackAt?new Date(values.callbackAt):null};
 const row=id?await tx.prospectPin.update({where:{id,version:expectedVersion},data:{...data,version:{increment:1}},include}):await tx.prospectPin.create({data:{...data,createdBy:actor.id},include});
 await tx.auditEvent.create({data:{actorId:actor.id,actorRole:actor.accountRole,action:id?'PROSPECT_PIN_UPDATED':'PROSPECT_PIN_CREATED',entityType:'ProspectPin',entityId:row.id,...(before?{before:JSON.parse(JSON.stringify(before))}:{}),after:JSON.parse(JSON.stringify(row))}});return row;
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});}
 async history(id:string,actor:AccessActor){requirePermission(actor,'map.read');if(!await this.db.prospectPin.findFirst({where:{id,...scope(actor)}}))throw new DomainError('NOT_FOUND','Porte introuvable.',404);return this.db.auditEvent.findMany({where:{entityType:'ProspectPin',entityId:id},orderBy:{createdAt:'desc'},take:50,select:{id:true,action:true,actorId:true,createdAt:true,after:true}})}
}
