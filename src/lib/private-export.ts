import path from 'node:path';
import {DomainError} from '../domain/rules';
/** Keep generated customer archives within the ignored private export root. */
export function privateExportRoot(batch:string,base=path.resolve('private-exports')){
 if(!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(batch))throw new DomainError('INVALID_EXPORT_BATCH','Nom de lot invalide : utilisez lettres, chiffres, points, tirets ou underscores.',400);
 return path.join(base,batch);
}
/** Never persist provider/database error messages: they may contain credentials. */
export function safeArchiveError(error:unknown){
 const code=error&&typeof error==='object'&&'code' in error?error.code:null;
 return typeof code==='string'&&/^[A-Z0-9_]{1,32}$/.test(code)?code:'EXPORT_FAILED';
}
