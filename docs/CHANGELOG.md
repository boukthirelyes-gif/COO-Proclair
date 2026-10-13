# Historique des livraisons

## 0.2.0 — branche rotor-capabilities-map — 2026-10-13

- Catalogue initial de 512 capacités candidates, avec origine, preuve, statut, permissions, limites et références de validation.
- Registre dynamique MCP avec snapshots persistés, schémas d’entrée/sortie, protocole, scopes et différences. Isolation des schémas modifiés et outils retirés.
- Consentement progressif pour les lectures Rotor ; scopes demandés et réellement accordés séparés. Aucune écriture distante.
- Cinq catégories de pins Proclair et UUID fournis, conservés avec provenance ; anciens suivis et audits préservés.
- Prévisualisation et import de pages de pins dans un miroir indépendant, avec validation des schémas courants et des coordonnées.
- Carte avec catégories, filtres de dates et calque Rotor réservé aux administrateurs. Never Knock reste protégé côté serveur.
- Santé et compatibilité : contrôle PostgreSQL, migrations, queue, snapshots, blocages et matrice paginée.
- Surveillance quotidienne de découverte MCP, désactivée par défaut, avec bail PostgreSQL. PR de dépendances proposées par Dependabot.

Cette entrée décrit le code de branche. Elle ne constitue pas une preuve de fusion ou de production. Les accès réels Rotor, Stripe, SMS, le fond de carte dans Codex et la fidélité des écrans privés demeurent limités comme indiqué dans INTEGRATION_LIMITATIONS.md.
