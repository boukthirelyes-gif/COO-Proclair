import test from 'node:test';
import assert from 'node:assert/strict';
import {rotorArchiveRead,type RotorArchiveTool} from '../src/lib/rotor';
import {privateExportRoot,safeArchiveError} from '../src/lib/private-export';
test('private Rotor reader rejects prototype names and invalid arguments before credentials or transport',async()=>{
 for(const name of ['constructor','__proto__','tools/call'])await assert.rejects(()=>rotorArchiveRead(name as RotorArchiveTool,{page:1,limit:100}),{code:'FORBIDDEN'});
 await assert.rejects(()=>rotorArchiveRead('list_customers',{page:2001,limit:100}),{code:'ROTOR_PAGE'});
 await assert.rejects(()=>rotorArchiveRead('list_customers',{page:1,limit:100,includeSecret:true}),{code:'ROTOR_ARGUMENTS'});
 await assert.rejects(()=>rotorArchiveRead('list_visits',{page:1,limit:100,start:'invalid',end:'2026-10-14'}),{code:'ROTOR_RANGE'});
});
test('private export names cannot escape ignored directory and error logs omit provider messages',()=>{
 assert.equal(privateExportRoot('rotor-2026','/tmp/private-exports'),'/tmp/private-exports/rotor-2026');
 for(const batch of ['../customer-data','/tmp/customer-data','', 'archive/secret','..'])assert.throws(()=>privateExportRoot(batch),{code:'INVALID_EXPORT_BATCH'});
 assert.equal(safeArchiveError(new Error('PRIVATE connection URI and token')),'EXPORT_FAILED');assert.equal(safeArchiveError({code:'ROTOR_SCOPE',message:'PRIVATE token'}),'ROTOR_SCOPE');assert.equal(safeArchiveError({code:'sk_test_private'}),'EXPORT_FAILED');
});
