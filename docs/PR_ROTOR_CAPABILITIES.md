# Titre de pull request

feat: add Rotor capability tracking and Proclair map categories

# Description prête à publier

Le client Rotor demandait un ensemble fixe de lectures et ne conservait pas d’historique de ses schémas. Il permet maintenant un consentement progressif en lecture, stocke des snapshots MCP avec scopes/protocole/schémas et isole les outils retirés ou modifiés. La page Santé et compatibilité montre les vérifications locales, migrations, queue, blocages et la matrice initiale de 512 capacités candidates. Une surveillance quotidienne, désactivée par défaut, compare les outils sans changer le code ni les objets Rotor.

La carte utilise les cinq catégories et UUID Proclair fournis, tout en préservant les anciens suivis et audits. Elle ajoute un panneau latéral, filtres de catégorie/date/membre, compteurs de pins et un calque Rotor réservé aux administrateurs. Les adaptateurs valident le schéma courant et importent une page de pins dans un miroir distinct, sans créer de clients ni assimiler les membres externes aux comptes locaux. Never Knock reste une restriction serveur. La restauration peut viser une base séparée et refuse toute cible non vide.

Validation : TypeScript et build Next.js réussis ; 44 tests Node, 84 contrôles Chromium et trois tests Python réussis ; matrice de 512 identifiants / 32 domaines vérifiée ; sauvegarde/restauration sur cible isolée puis refus d’une seconde restauration validés ; scan de secrets sans détection. Les flux Rotor métier utilisent des fixtures/mocks. Les métadonnées OAuth et sept articles officiels ont été lus réellement.

Impact : migration additive, aucune suppression de données métier, aucune écriture Rotor, aucun paiement ou message envoyé. Aucun statut PRODUCTION_VERIFIED. Les catégories initiales portent la provenance USER_PROVIDED_REFERENCE jusqu’à une relecture Rotor autorisée. La production et les tuiles sont bloquées par le réseau Codex ; l’OAuth du compte n’est pas enregistré ici. La facturation par job, les récurrences complètes, territoires, routage, Stripe, communications et commissions restent à développer/autoriser selon les documents de limites. Dependabot propose les mises à jour sans fusion automatique.

La branche ne doit pas être présentée comme déployée en production. Après revue et fusion, vérifier les variables de production, la migration et la compatibilité du plan Vercel avec deux crons quotidiens.
