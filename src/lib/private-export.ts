import path from 'node:path';
import {requirePermission,type AccessActor} from './access';
import type {RotorArchiveTool} from './rotor';
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

export function requireArchivePermissions(actor:AccessActor,tool:RotorArchiveTool){
 requirePermission(actor,'integrations');requirePermission(actor,'export');requirePermission(actor,'crm.read');
 if(['list_invoices','list_payments','list_payroll','list_timesheets','list_visit_timers'].includes(tool))requirePermission(actor,'finance');
 if(['list_company_members','list_payroll'].includes(tool))requirePermission(actor,'users');
 if(['search_map_pins','list_map_pin_types'].includes(tool)){requirePermission(actor,'map.read');requirePermission(actor,'map.all')}
 if(['list_leads','list_pipelines','list_pipeline_stages'].includes(tool)){requirePermission(actor,'leads.read');requirePermission(actor,'leads.all')}
 if(tool==='list_quotes')requirePermission(actor,'quotes');
}
