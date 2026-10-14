# Rotor / Surge — SMS read-only mirror

The Rotor SMS integration is **not Twilio**. The existing company number remains hosted by Rotor/Surge.
This feature only reads Rotor messages and copies them into Proclair's separate PostgreSQL mirror after an administrator explicitly confirms a page import.

## Set up
1. Deploy additive migration `20261013200000_rotor_sms_inbox` on the intended database (Preview first).
2. In Proclair > Intégrations, request the **inbox:read** scope during Rotor OAuth consent.
3. Click **Découvrir les outils disponibles** after reconnecting. The discovered `list_messages` tool must be marked ACTIVE. If its input/output schema changes it is blocked for review.
4. In **Boîte SMS Rotor / Surge**, import page 1, then page 2 etc. Each import reads max 100 SMS. External IDs deduplicate re-imports.
5. Search all locally imported messages with the 100-per-page history view. Message IDs de-duplicate re-imports.
6. Review matched messages under an individual client's 'SMS Rotor' tab. Matching uses exact approved Rotor IDs only; ambiguous or unknown contacts stay unlinked.
7. In 'Boîte SMS Rotor', an admin can explicitly enable the daily read-only import. The new control is OFF by default. OMEGA recognizes SMS follow-up queries using only the locally imported, latest inbound conversations.

Messages, phone numbers, and external IDs are private and stored only in PostgreSQL; never commit them to Git.
This app uses its own OAuth consent. A ChatGPT Rotor connection or a Rotor-issued API key is NOT automatically available to Vercel.
The import action requires a signed-in account with `integrations` and `crm.read` permission and same-origin checks. It never sends, edits, deletes or marks messages read at Rotor. The audit log stores only page number and imported count.

## Limitations
- Manual paginated backfill plus an opt-in Vercel cron at 13:30 UTC. Each cron run imports page 1 (the 100 most recent messages); more than 100 new messages between runs can leave gaps. To backfill older history, use manual page import. No continuous real-time sync, no provider webhooks.
- The history view is paginated (100 per page); the follow-up preview scans at most 500 recently imported SMS and is not an exhaustive to-do list.
- No SMS sending API offered by the connected Rotor tool inventory; an outgoing path must be confirmed with Rotor/Surge before implementation.
- No phone-number porting, webhook configuration, automatic customer matching, media import, email syncing, or voice recording.
- Functionality is verified with unit tests and an independent connection stub; production OAuth and live data import must be validated in the user's Vercel account.

## Safety checks
- Admin-only activation; no rotation, Twilio credentials or phone number migration.
- Cron endpoint `/api/cron/rotor-sms` requires the production `CRON_SECRET` Bearer header, shares no data in unauthorized responses, and acquires a PostgreSQL lease to prevent overlap.
- `inbox:read` OAuth scope and active discovered `list_messages` schema are required to import; if missing or changed, imports fail closed with a diagnostic code.
- Every CRM read requires both `crm.read` and `integrations` permissions. No SMS content is included in audit events.
- OMEGA uses deterministic inbound-last review suggestions only. It does not draft/send real replies, reschedule clients, or change Rotor records.
- New migration `20261013203000_rotor_sms_sync` adds only links and the opt-in control. Preview-test with distinct DB before production.
