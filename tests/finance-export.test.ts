import test from 'node:test';
import assert from 'node:assert/strict';
import {csvCell,csvRows,sumCents} from '../src/lib/finance-export';
test('CSV preserves commas, quotation marks, French and newlines without extra columns',()=>{
  assert.equal(csvCell('Élodie, "Proclair"\nNotes'),'"Élodie, ""Proclair""\nNotes"');
  assert.equal(csvRows(['customer','cents'],[{customer:'Élodie, Inc.',cents:123}]),'\uFEFF"customer","cents"\r\n"Élodie, Inc.","123"\r\n');
});
test('CSV neutralizes formulas even behind whitespace and control characters',()=>{
  for (const value of ['=HYPERLINK("https://example.invalid")',' +SUM(1,2)','\t@SUM(1,2)','\r-CMD']) assert.ok(csvCell(value).startsWith('"\''));
  assert.equal(csvCell('Client normal'),'"Client normal"');
});
test('monetary reports sum integer cents and reject precision overflow',()=>{
  assert.equal(sumCents([101,202,303]),606);
  assert.throws(()=>sumCents([1.1]));
  assert.throws(()=>sumCents([Number.MAX_SAFE_INTEGER,1]));
});
