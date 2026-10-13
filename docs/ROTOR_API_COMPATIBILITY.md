# Compatibilité Rotor

## Découverte et consentement

La configuration demande historiquement les lectures clients, jobs, visites et factures avec `offline_access`. L’administrateur peut maintenant choisir des lectures supplémentaires, dont `pins:read`, au prochain consentement OAuth. Les scopes d’écriture sont refusés par cette implémentation. Les métadonnées officielles offrent les scopes listés dans `src/data/rotor-sources.json` ; une offre du serveur ne constitue pas un droit accordé au compte.

`requestedScopes` est conservé dans le flux OAuth chiffré et dans les tokens persistés. `grantedScopes` vient de la réponse effective du serveur. Le renouvellement ne peut élargir les droits au-delà de la demande autorisée. Les PKCE, reçus single-use, chiffrement AES-GCM, verrous PostgreSQL et révocation existants sont conservés. Le contexte signé du callback reste en SameSite=Lax ; la session principale reste Strict.

## Protocole et limites

Les versions MCP prises en charge explicitement sont 2025-03-26, 2025-06-18 et 2025-11-25. Une version différente est rejetée avant appel métier. La découverte est limitée à 20 pages, 1 000 outils et des réponses HTTP de 1 Mo. Un inventaire partiel ne signifie jamais que les outils absents ont été supprimés.

`RotorCapabilitySnapshot` conserve l’inventaire, ses scopes, protocole, empreinte et différences. `RotorCapabilityGuard` isole les outils retirés ou dont les schémas/annotations ont changé. Un nouveau passage identique ne réactive pas un outil bloqué. La réactivation exige un adaptateur de lecture implémenté, l’empreinte courante et une validation explicite auditée. Un outil annoncé comme destructif ou non read-only ne peut être réactivé comme lecture.

Les pages du miroir clients/jobs/visites exigent désormais une découverte et des adaptateurs actifs. Les nouveaux adaptateurs de pins valident les arguments avec le schéma JSON courant ; un schéma de sortie annoncé est aussi vérifié. Les références `$ref` externes ne sont pas téléchargées. Aucun nom de filtre de `search_map_pins` n’est supposé : l’administrateur utilise le schéma reçu.

## Surveillance

`GET /api/cron/compatibility` exige `CRON_SECRET`. Le cron Vercel est quotidien à 13:15 UTC. La surveillance est désactivée par défaut et s’active dans Santé et compatibilité. Un bail PostgreSQL empêche deux instances de contrôler simultanément ; un résultat réussi reporte le prochain contrôle à 24 heures. Un échec enregistre seulement un code borné et rend le contrôle éligible une heure plus tard, sans multiplier les requêtes dans une même invocation. Le cron quotidien ne garantit donc pas une reprise horaire.

La surveillance découvre les outils en lecture seule. Elle ne change pas le code, ne migre pas les données, ne contacte pas de clients et ne fait pas de mise à jour automatique de production. Les sources documentaires publiques ont un registre versionné de dates et d’empreintes ; leur surveillance automatique continue n’est pas encore implémentée.

Les HTTP 429 donnent un état explicite de limitation de débit. Les appels ont des délais et ne sont pas rejoués automatiquement dans la même requête. Une ingestion complète durable, une outbox de synchronisation, les checkpoints de toutes les entités et les adaptateurs d’écriture restent à développer.
