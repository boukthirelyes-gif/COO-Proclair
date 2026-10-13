import type {PrismaClient} from '@prisma/client';
import type {NextRequest} from 'next/server';
import {readSession,checkPassword} from './auth';
import {bootstrapActor,userActor,verifyPassword} from './access';
export async function resolveActor(db:PrismaClient,request:NextRequest,cookieName?:string){const session=readSession(request,cookieName);if(!session)return null;if(session.id==='admin'&&session.role==='ADMIN')return bootstrapActor;
 const user=await db.appUser.findUnique({where:{id:session.id}});return user?.active&&user.sessionVersion===session.sessionVersion?userActor(user):null;
}
export async function authenticate(db:PrismaClient,input:unknown){
 if(!input||typeof input!=='object'||!('password'in input)||typeof input.password!=='string'||input.password.length>256)return null;
 const username='username'in input&&typeof input.username==='string'?input.username.trim().toLowerCase():'admin';
 if(username.length>100)return null;
 if(username==='admin')return checkPassword(input.password)?bootstrapActor:null;
 const user=await db.appUser.findUnique({where:{username}}),valid=verifyPassword(input.password,user?.passwordHash||'unknown-user:'+ '00'.repeat(64));return valid&&user?.active?userActor(user):null;
}
