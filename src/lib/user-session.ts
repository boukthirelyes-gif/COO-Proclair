import type {PrismaClient} from '@prisma/client';
import type {NextRequest} from 'next/server';
import {readSession,checkPassword} from './auth';
import {verifyAccountMfa} from './account-mfa';
import {bootstrapEpoch} from './security-management';
import {bootstrapActor,userActor,verifyPassword} from './access';
export async function resolveActor(db:PrismaClient,request:NextRequest,cookieName?:string){const session=readSession(request,cookieName);if(!session)return null;if(session.id==='admin'&&session.role==='ADMIN'){const epoch=await db.securitySessionEpoch.findUnique({where:{id:bootstrapEpoch}});return (session.sessionVersion??0)===(epoch?.version??0)?{...bootstrapActor,sessionVersion:epoch?.version??0}:null;}
 const user=await db.appUser.findUnique({where:{id:session.id}});return user?.active&&user.sessionVersion===session.sessionVersion?userActor(user):null;
}
export async function authenticate(db:PrismaClient,input:unknown){
 if(!input||typeof input!=='object'||!('password'in input)||typeof input.password!=='string'||input.password.length>256)return null;
 if('username'in input&&typeof input.username!=='string')return null;
 if(Object.keys(input).some(k=>!['username','password','code'].includes(k))||('code'in input&&(typeof input.code!=='string'||input.code.length>80)))return null;
 const username='username'in input&&typeof input.username==='string'?input.username.trim().toLowerCase():'admin';
 if(username.length>100)return null;
 if(username==='admin'){if(!checkPassword(input.password)||!await verifyAccountMfa(db,'admin','code'in input?input.code:undefined))return null;const epoch=await db.securitySessionEpoch.findUnique({where:{id:bootstrapEpoch}});return {...bootstrapActor,sessionVersion:epoch?.version??0};}
 const user=await db.appUser.findUnique({where:{username}}),valid=verifyPassword(input.password,user?.passwordHash||'unknown-user:'+ '00'.repeat(64));return valid&&user?.active&&await verifyAccountMfa(db,user.id,'code'in input?input.code:undefined)?userActor(user):null;
}
