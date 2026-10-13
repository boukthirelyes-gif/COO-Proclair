ALTER TABLE "RotorImportRun" DROP CONSTRAINT "RotorImportRun_range";
ALTER TABLE "RotorImportRun" ADD CONSTRAINT "RotorImportRun_range"
 CHECK ("end">"start" AND "end"-"start"<=interval '366 days');
