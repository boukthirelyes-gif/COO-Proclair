import {timingSafeEqual,createHash} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
export function cronAuthorized(authorization:string|null,secret=process.env.CRON_SECRET){
 if(!secret||secret.length<32||!authorization)return false;
 const actual=Buffer.from(authorization),expected=Buffer.from('Bearer '+secret);
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
export async function takeLoginAttempt(db:PrismaClient,now=Date.now(),identity='admin'){
 await db.loginBucket.deleteMany({where:{expiresAt:{lt:new Date(now)}}});
 const bucket=Math.floor(now/60000);const key=identity==='admin'?'admin':createHash('sha256').update(identity).digest('hex');
 const result=await db.loginBucket.upsert({where:{id:`${key}:${bucket}`},create:{id:`${key}:${bucket}`,attempts:1,expiresAt:new Date((bucket+2)*60000)},update:{attempts:{increment:1}}});
 return result.attempts<=8;
}
