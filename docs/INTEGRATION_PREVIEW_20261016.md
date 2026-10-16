# Proclair CRM — intégration Missions 2, 3 et 4

Base: `develop` (b49179e87dc96800a39b681effd782f767bef327). Source: `feat/mission4-communication-center` (2a17e3354d7324290aa5a0aa33989cd67d95a11d).

Cette intégration regroupe les changements de parcours client, Stripe Enterprise, centre de communications et leurs tests et migrations. Elle conserve les correctifs de diagnostic PostgreSQL (HTTP 503 si schéma absent) introduits dans `develop`.

Ne pas promouvoir en production avant validation CI, test du schéma Preview et validation explicite des fonctions visibles. Stripe LIVE et les envois externes ne doivent pas être activés automatiquement. La configuration Preview utilise exclusivement la base Neon `proclair-preview` ; ne pas migrer `proclair`.

Les nouvelles migrations sont 20261016050000, 20261016060000 et 20261016070000. Un déploiement Vercel Preview distinct ne déploie pas automatiquement la production.
