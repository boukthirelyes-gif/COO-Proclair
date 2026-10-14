# Proclair — audit du lot Google Maps (2026-10-14)

Base existante conservée sur la branche feature/proclair-google-maps-parity-20261014.
Ce lot remplace uniquement le rendu Leaflet de la carte de prospection par le SDK
Google Maps officiel. Les endpoints, permissions, versions concurrentes, historiques,
catégories, restrictions de contact, territoires et formulaires restent natifs.
Les autres cartes historiques ne sont pas encore migrées.

La clé Google est absente de cet environnement. La liste, les filtres serveur,
la pagination et la saisie manuelle restent utilisables sans téléchargement du SDK.
Le rendu Google réel nécessite une clé et une validation navigateur séparée.
Pas de migration de données depuis les captures, pas d’envoi SMS ni de paiement.
Pas de modification des commissions annuelles sur ventes signées hors taxes.

## Validation de ce lot

- Compilation de production et contrôle TypeScript réussis.
- 127 tests métier réussis, zéro échec et zéro test ignoré ; base séparée.
- Navigateur Chromium : 6 contrôles filtres/pagination, 5 territoires manuels,
  8 utilisateurs/affectations/restrictions/révocation ; aucune erreur JavaScript.
- Ces parcours utilisent le mode sans clé : ils ne valident pas le rendu Google,
  les clics sur ses marqueurs, Street View, les regroupements ou le dessin SDK.
- Les tests hérités ciblant les classes Leaflet ont été adaptés aux parcours natifs
  sans clé. Une validation du SDK réel reste requise avant fusion en production.
- Le test utilisateurs attend désormais le classement vendeur existant, ajouté
  dans une version précédente, sans élargir les droits du compte.
