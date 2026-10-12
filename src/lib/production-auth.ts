import {timingSafeEqual} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
export function cronAuthorized(authorization:string|null,secret=process.env.CRON_SECRET){
 if(!secret||secret.length<32||!authorization)return false;
 const actual=Buffer.from(authorization),expected=Buffer.from('Bearer '+secret);
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
export async function takeLoginAttempt(db:PrismaClient,now=Date.now()){
 await db.loginBucket.deleteMany({where:{expiresAt:{lt:new Date(now)}}});
 const bucket=Math.floor(now/60000);
 const result=await db.loginBucket.upsert({where:{id:`admin:${bucket}`},create:{id:`admin:${bucket}`,attempts:1,expiresAt:new Date((bucket+2)*60000)},update:{attempts:{increment:1}}});
 return result.attempts<=8;
}
