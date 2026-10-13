# Titre

feat: deliver Proclair V30 dark workspace, resumable Rotor staging and signed service agreements

# Description

La navigation plate et les imports manuels de 25 lignes empêchaient une utilisation quotidienne et une migration contrôlée. Cette livraison reprend le thème sombre de la branche design/rotor-dark-mode, regroupe les modules, ajoute la recherche globale filtrée par permissions, les actions rapides et les dossiers clients. OMEGA dispose d’un assistant déterministe sur les données PostgreSQL et conserve l’application supervisée de ses plans.

Le staging Rotor conserve les checkpoints, totaux source, empreintes et erreurs par catégorie. Il reprend plusieurs pages sans doublon et refuse les fins implicites, pages répétées et comptages contradictoires. Clients, jobs et visites sont les seuls adaptateurs couverts ; les visites sont bornées à la période. Une promotion client séparée examine les correspondances et conserve les données existantes. Aucun paiement ni promotion financière.

Le parcours Service / Agree / Schedule enregistre les remises et prix par passage en dollars, fige les conditions à l’émission, consigne l’accord par lien privé et archive le PDF avec empreinte. La création humaine des passages produit des jobs et visites PENDING, sans faux créneau confirmé. Les contrats historiques, rôles, facturation, devis, portail et OMEGA sont conservés. Trois migrations additives ; police Open Sans sous Apache-2.0 incluse dans le tracing Vercel. AJV mis à jour à 8.20.0.

Validation : build et TypeScript réussis, 52 tests Node et trois tests Python réussis, 109 contrôles Chromium exécutés pendant la livraison, zéro pageerror dans les parcours finalisés. Pagination/reprise/promotion utilisent des fixtures dans des bases distinctes ; données Rotor réelles importées : zéro. Audit runtime sans vulnérabilité signalée après correctif et scan de secrets sans détection. Sauvegarde/restauration sur une cible vide retrouve 18 migrations et cinq catégories.

Cette première tranche V30 ne livre pas Stripe/Twilio/courriels, territoires/satellite/clustering/routage, commissions, récurrences automatiques ou portail vendeur de contrats complet. L’accord est fondé sur nom saisi et consentement, sans certificat qualifié ni mandat bancaire. Pas d’AUTOPILOT, messages ou encaissements externes. Aucune production ou Preview distante certifiée ; déployer une Preview isolée avant la revue de production. Détails et point de reprise : docs/PROCLAIR_V30_OVERNIGHT_REPORT.md.
