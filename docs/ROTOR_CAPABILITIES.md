# Capacités Rotor et référence de compte

Le client COO Proclair découvre les outils avec MCP `initialize`, notification d’initialisation et `tools/list` paginé. Il n’a aucune hypothèse fixe de 47 outils. Les schémas d’entrée, de sortie, annotations, protocole négocié et scopes effectivement accordés sont conservés dans PostgreSQL.

## Sources observées

Métadonnées OAuth et sept articles officiels lus le 2026-10-13 ; empreintes dans `src/data/rotor-sources.json`. L’interface privée et la production Vercel ne sont pas accessibles via le réseau de cette instance. Aucun token Rotor n’est enregistré localement.

## Référence des 47 noms fournis par l’administrateur

Cette liste vient de la directive, qui décrit une connexion ChatGPT. Elle ne prouve pas leur disponibilité pour le client OAuth COO. L’application ne les exécute pas sur cette seule référence.

| Nom fourni | Nature du nom | Adaptateur local de lecture |
| --- | --- | --- |
| get_current_context | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| list_company_members | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| list_contacts | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| list_leads | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| get_lead | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| create_lead | Écriture potentielle, non exécutée | Non implémenté |
| update_lead | Écriture potentielle, non exécutée | Non implémenté |
| list_customers | Lecture annoncée, à découvrir pour ce client | Implémenté, conditionné aux droits et schémas |
| get_customer | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| create_customer | Écriture potentielle, non exécutée | Non implémenté |
| update_customer | Écriture potentielle, non exécutée | Non implémenté |
| list_jobs | Lecture annoncée, à découvrir pour ce client | Implémenté, conditionné aux droits et schémas |
| get_job | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| list_visits | Lecture annoncée, à découvrir pour ce client | Implémenté, conditionné aux droits et schémas |
| get_visit | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| update_visit | Écriture potentielle, non exécutée | Non implémenté |
| get_clock_status | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| list_timesheets | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| get_timesheet | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| list_visit_timers | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| get_visit_timers | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| list_tasks | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| get_task | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| create_task | Écriture potentielle, non exécutée | Non implémenté |
| update_task | Écriture potentielle, non exécutée | Non implémenté |
| list_messages | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| list_campaigns | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| create_campaign | Écriture potentielle, non exécutée | Non implémenté |
| add_people_to_campaign | Écriture potentielle, non exécutée | Non implémenté |
| list_message_templates | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| create_message_template | Écriture potentielle, non exécutée | Non implémenté |
| list_quotes | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| get_quote | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| list_payments | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| get_payment | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| list_payroll | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| list_pipelines | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| get_pipeline | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| list_pipeline_stages | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| get_pipeline_stage | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| list_service_plans | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| get_service_plan | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| search_map_pins | Lecture annoncée, à découvrir pour ce client | Implémenté, conditionné aux droits et schémas |
| list_map_pin_types | Lecture annoncée, à découvrir pour ce client | Implémenté, conditionné aux droits et schémas |
| summarize_map_pin_activity | Lecture annoncée, à découvrir pour ce client | Implémenté, conditionné aux droits et schémas |
| list_invoices | Lecture annoncée, à découvrir pour ce client | Non implémenté |
| get_invoice | Lecture annoncée, à découvrir pour ce client | Non implémenté |

Une nouvelle découverte peut annoncer davantage ou moins d’outils. Un outil inconnu reste simplement DISCOVERED ; il ne devient pas exécutable automatiquement. Les écritures distantes, campagnes, SMS, paiements et effets secondaires ne sont pas activés.
