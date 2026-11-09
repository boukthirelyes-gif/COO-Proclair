import {Prisma} from '@prisma/client';
import {DomainError} from '../domain/rules';
type ContactDatabase=Pick<Prisma.TransactionClient,'prospectPin'>;
type SourcePin={contactAddressKey:string;status:string;type?:{restricted:boolean}|null};

// One bounded lookup per result batch, not one lookup per lead or seller option.
// The ORM delegate retains the client tenant schema, unlike raw unqualified SQL.
export async function restrictedContactKeys(db:ContactDatabase,keys:readonly (string|undefined)[]){
 const unique=[...new Set(keys.filter((key):key is string=>!!key))];
 if(!unique.length)return new Set<string>();
 const rows=await db.prospectPin.groupBy({by:['contactAddressKey'],where:{contactAddressKey:{in:unique},OR:[{status:'DO_NOT_CONTACT'},{type:{is:{restricted:true}}}]}});
 return new Set(rows.map(row=>row.contactAddressKey));
}

export async function pinContactRestricted(db:ContactDatabase,pin:SourcePin|null|undefined){
 if(!pin)return false;
 return pin.status==='DO_NOT_CONTACT'||pin.type?.restricted===true||(await restrictedContactKeys(db,[pin.contactAddressKey])).has(pin.contactAddressKey);
}

export async function assertPinContactAllowed(tx:Prisma.TransactionClient,pin:(SourcePin&{id:string})|null|undefined){
 if(!pin)return;
 // Serialize commercial mutations with the same lock as pin restrictions.
 await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928364)`;
 const current=await tx.prospectPin.findUnique({where:{id:pin.id},select:{contactAddressKey:true,status:true,type:{select:{restricted:true}}}});
 if(!current)throw new DomainError('NOT_FOUND','Porte source indisponible.',404);
 if(await pinContactRestricted(tx,current))throw new DomainError('DO_NOT_CONTACT','Cette adresse nécessite une revue administrateur avant toute sollicitation.',403);
}

// Normalize the input with exactly the database-generated column expression.
// This query has no table reference; all pin reads below use the tenant-scoped ORM.
export async function contactAddressKey(tx:Prisma.TransactionClient,address:string){
 const [row]=await tx.$queryRaw<{key:string}[]>`SELECT lower(btrim(regexp_replace(normalize(${address}, NFKC), '[[:space:]]+', ' ', 'g'))) AS key`;
 return row.key;
}

export async function protectContactAddress(tx:Prisma.TransactionClient,input:{
 id:string|null;address:string;latitude:number;longitude:number;status:string;
 before:{contactAddressKey:string;latitude:number;longitude:number}|null;
 wasRestricted:boolean;
}){
 const key=await contactAddressKey(tx,input.address);
 // Moving a restriction would silently make its old door solicitable again.
 // First lift it at its original location through the existing audited admin flow.
 if(input.wasRestricted&&input.before&&(input.before.contactAddressKey!==key||input.before.latitude!==input.latitude||input.before.longitude!==input.longitude)){
  throw new DomainError('DO_NOT_CONTACT','La restriction doit être révisée à son adresse actuelle avant tout déplacement.',403);
 }
 if(input.status==='DO_NOT_CONTACT')return;
 const restricted=await tx.prospectPin.findFirst({where:{contactAddressKey:key,...(input.id?{id:{not:input.id}}:{}),OR:[{status:'DO_NOT_CONTACT'},{type:{is:{restricted:true}}}]},select:{id:true}});
 if(restricted)throw new DomainError('DO_NOT_CONTACT','Cette adresse nécessite une revue administrateur avant toute sollicitation.',403);
}
