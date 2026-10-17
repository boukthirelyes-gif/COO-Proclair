import type {PrismaClient} from '@prisma/client';
import sources from '../data/rotor-sources.json';
import packageInfo from '../../package.json';
import {providerStatus} from '../providers/config';
import {providerHealthSummary} from './provider-health';
import {operationalReadiness} from './operational-readiness';
import {rotorStatus} from './rotor';
import {RotorCapabilityRegistry} from './rotor-capabilities';
export async function systemHealth(db:PrismaClient){
 const start=performance.now();await db.$queryRaw`SELECT 1`;const database={status:'CONNECTED',checkedAt:new Date().toISOString(),latencyMs:Math.round(performance.now()-start)};
 const [capabilities,rotor,queue,monitor,migrations]=await Promise.all([new RotorCapabilityRegistry(db).state(),rotorStatus(),db.workerJob.groupBy({by:['status'],_count:{_all:true}}),db.rotorMonitorControl.findUnique({where:{id:'rotor-compatibility'}}),db.$queryRaw<{name:string;applied_at:Date}[]>`SELECT name, applied_at FROM "_proclair_migrations" ORDER BY applied_at DESC, name DESC`]);
 return {sources,application:{version:packageInfo.version,node:process.version,commit:process.env.VERCEL_GIT_COMMIT_SHA||null,environment:process.env.VERCEL_ENV||'local',productionVerified:false},database,rotor,capabilities,monitor:monitor??{enabled:false,lastCheckedAt:null,lastCode:null},queue:Object.fromEntries(queue.map(v=>[v.status,v._count._all])),migrations,readiness:operationalReadiness(process.env,providerStatus()),providers:providerHealthSummary(providerStatus(),rotor),security:{vulnerabilities:'NOT_CHECKED_AT_RUNTIME'},parity:{candidates:512,productionVerified:false}};
}
