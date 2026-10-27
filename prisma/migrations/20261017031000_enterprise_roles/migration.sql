ALTER TABLE "AppUser" ADD COLUMN "technicianId" TEXT;
CREATE UNIQUE INDEX "AppUser_technicianId_key" ON "AppUser"("technicianId");
ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL;
ALTER TABLE "AppUser" DROP CONSTRAINT "AppUser_role_check";
ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_role_check" CHECK ("role" IN ('ADMIN','MANAGER','DISPATCHER','SELLER','VIEWER','OWNER','GENERAL_MANAGER','SALES_MANAGER','OPERATIONS_MANAGER','TECHNICIAN','OFFICE'));
-- Existing accounts retain their roles; no automatic managerial promotion.
UPDATE "AppUser" SET "permissions"=array_append("permissions",'employee.self'),"sessionVersion"="sessionVersion"+1 WHERE "role"='ADMIN' AND NOT ('employee.self'=ANY("permissions"));
ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_role_permissions_check" CHECK ("permissions" <@ CASE
 WHEN "role" IN ('ADMIN','OWNER') THEN ARRAY['crm.read','crm.write','dispatch','finance','quotes','omega','map.read','map.write','map.all','users','settings','integrations','export','audit','leads.read','leads.write','leads.all','sales.write','employee.self']::text[]
 WHEN "role" IN ('MANAGER','GENERAL_MANAGER') THEN ARRAY['crm.read','crm.write','dispatch','finance','quotes','omega','map.read','map.write','map.all','leads.read','leads.write','leads.all','sales.write']::text[]
 WHEN "role"='DISPATCHER' THEN ARRAY['crm.read','dispatch','omega','map.read']::text[]
 WHEN "role"='OPERATIONS_MANAGER' THEN ARRAY['crm.read','dispatch','omega','map.read','map.all']::text[]
 WHEN "role"='SALES_MANAGER' THEN ARRAY['crm.read','quotes','map.read','map.write','map.all','leads.read','leads.write','leads.all','sales.write']::text[]
 WHEN "role"='OFFICE' THEN ARRAY['crm.read','crm.write','quotes']::text[]
 WHEN "role"='SELLER' THEN ARRAY['map.read','map.write','leads.read','leads.write','sales.write']::text[]
 WHEN "role"='TECHNICIAN' THEN ARRAY['employee.self']::text[]
 ELSE ARRAY['crm.read','map.read','leads.read']::text[] END);

-- Private operational notes are not copied to the employee-facing field.
ALTER TABLE "Visit" ADD COLUMN "technicianInstructions" TEXT NOT NULL DEFAULT '';
