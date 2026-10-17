import {inflateSync} from 'node:zlib';
import {z} from 'zod';
import type {PrismaClient} from '@prisma/client';
import {ProspectingService} from './service';
import {requirePermission,type AccessActor} from '../lib/access';
import {DomainError} from '../domain/rules';
export function decodePinPhoto(input:unknown){
 const data=z.object({base64:z.string().min(16).max(410000),caption:z.string().trim().max(300).default('')}).strict().parse(input);
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(data.base64))throw new DomainError('INVALID_PHOTO','Image PNG invalide.');
 const bytes=Buffer.from(data.base64,'base64');
 if(bytes.length>300000||bytes.length<33||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.subarray(12,16).toString()!=='IHDR'||bytes.readUInt32BE(8)!==13)throw new DomainError('INVALID_PHOTO','PNG de moins de 300 Ko requis.');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 if(!width||!height||width>1600||height>1600||width*height>2000000)throw new DomainError('INVALID_PHOTO','Photo trop grande.');
 if(bytes[24]!==8||![2,6].includes(bytes[25])||bytes[26]!==0||bytes[27]!==0||bytes[28]!==0)throw new DomainError('INVALID_PHOTO','PNG RGB/RGBA 8 bits sans entrelacement requis.');
 const crc=(chunk:Buffer)=>{let n=0xffffffff;for(const b of chunk){n^=b;for(let k=0;k<8;k++)n=(n>>>1)^((n&1)?0xedb88320:0)}return (n^0xffffffff)>>>0};
 const kept:Buffer[]=[bytes.subarray(0,8)],compressed:Buffer[]=[];let offset=8,ended=false;
 while(offset<bytes.length){if(offset+12>bytes.length)throw new DomainError('INVALID_PHOTO','PNG tronqué.');const n=bytes.readUInt32BE(offset),end=offset+12+n;if(end>bytes.length)throw new DomainError('INVALID_PHOTO','PNG tronqué.');const type=bytes.subarray(offset+4,offset+8).toString();if((type==='IHDR'&&offset!==8)||(type==='IEND'&&n!==0))throw new DomainError('INVALID_PHOTO','Structure PNG invalide.');if(crc(bytes.subarray(offset+4,offset+8+n))!==bytes.readUInt32BE(offset+8+n))throw new DomainError('INVALID_PHOTO','PNG corrompu.');if(['IHDR','IDAT','IEND'].includes(type))kept.push(bytes.subarray(offset,end));if(type==='IDAT')compressed.push(bytes.subarray(offset+8,offset+8+n));offset=end;if(type==='IEND'){ended=true;break}}
 if(!ended||offset!==bytes.length||!compressed.length)throw new DomainError('INVALID_PHOTO','PNG incomplet.');const expected=(width*(bytes[25]===6?4:3)+1)*height;try{const pixels=inflateSync(Buffer.concat(compressed),{maxOutputLength:expected+1});if(pixels.length!==expected)throw Error();}catch{throw new DomainError('INVALID_PHOTO','Données PNG invalides.');}
 return {bytes:Buffer.concat(kept),mime:'image/png',caption:data.caption};
}
export class PinPhotos {
 constructor(private db:PrismaClient){}
 async list(pinId:string,actor:AccessActor){await new ProspectingService(this.db).get(pinId,actor);return this.db.prospectPinPhoto.findMany({where:{pinId},select:{id:true,caption:true,createdAt:true},orderBy:{createdAt:'desc'},take:10})}
 async get(pinId:string,id:string,actor:AccessActor){await new ProspectingService(this.db).get(pinId,actor);const row=await this.db.prospectPinPhoto.findFirst({where:{id,pinId}});if(!row)throw new DomainError('NOT_FOUND','Photo introuvable.',404);return row;}
 async add(pinId:string,input:unknown,actor:AccessActor){requirePermission(actor,'map.write');await new ProspectingService(this.db).get(pinId,actor);const data=decodePinPhoto(input);return this.db.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928364)`;const pin=await tx.prospectPin.findFirst({where:{id:pinId,...(!actor.permissions.includes('map.all')?{ownerId:actor.id}:{})}});if(!pin)throw new DomainError('NOT_FOUND','Porte introuvable.',404);if(await tx.prospectPinPhoto.count({where:{pinId}})>=10)throw new DomainError('PHOTO_LIMIT','Dix photos maximum par porte.',409);const row=await tx.prospectPinPhoto.create({data:{...data,pinId,createdBy:actor.id},select:{id:true,caption:true,createdAt:true}});await tx.auditEvent.create({data:{actorId:actor.id,actorRole:actor.accountRole,action:'PIN_PHOTO_ADDED',entityType:'ProspectPin',entityId:pinId,after:{photoId:row.id,caption:row.caption}}});return row;})}
}
