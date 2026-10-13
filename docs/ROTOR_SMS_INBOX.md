# Rotor / Surge — SMS read-only mirror

The Rotor SMS integration is **not Twilio**. The existing company number remains hosted by Rotor/Surge.
This feature only reads Rotor messages and copies them into Proclair's separate PostgreSQL mirror after an administrator explicitly confirms a page import.

## Set up
1. Deploy additive migration `20261013200000_rotor_sms_inbox` on the intended database (Preview first).
2. In Proclair > Intégrations, request the **inbox:read** scope during Rotor OAuth consent.
3. Click **Découvrir les outils disponibles** after reconnecting. The discovered `list_messages` tool must be marked ACTIVE. If its input/output schema changes it is blocked for review.
4. In **Boîte SMS Rotor / Surge**, import page 1, then page 2 etc. Each import reads max 100 SMS. External IDs deduplicate re-imports.
5. Search and view the 100 latest locally imported messages; the total count is shown separately.

Messages, phone numbers, and external IDs are private and stored only in PostgreSQL; never commit them to Git.
This app uses its own OAuth consent. A ChatGPT Rotor connection or a Rotor-issued API key is NOT automatically available to Vercel.
The import action requires a signed-in account with `integrations` and `crm.read` permission and same-origin checks. It never sends, edits, deletes or marks messages read at Rotor. The audit log stores only page number and imported count.

## Limitations
- Manual paginated import, not yet an always-running background sync.
- Cached UI shows newest 100 messages from the pages imported, not all historical messages at once.
- No SMS sending API offered by the connected Rotor tool inventory; an outgoing path must be confirmed with Rotor/Surge before implementation.
- No phone-number porting, webhook configuration, automatic customer matching, media import, email syncing, or voice recording.
- Functionality is verified with unit tests and an independent connection stub; production OAuth and live data import must be validated in the user's Vercel account.
