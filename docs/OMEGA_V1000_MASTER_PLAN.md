# OMEGA V1000 — plan de livraison

## Accès et agendas — 2026-10-14

VERIFIED : origines exactes Vercel autorisées via configuration serveur, normalisation du slash final, HTTPS derrière proxy et erreurs de connexion distinctes. Le mot de passe existant n’est pas modifié ; les domaines tiers restent refusés.

VERIFIED : export iCalendar du planning pour import ponctuel Google Agenda, Outlook et Apple Calendar. Droits Intégrations + lecture CRM + export, période de 31 jours, refus au-delà de 2 000 rendez-vous, compteur des créneaux incomplets, UID stable et texte échappé/fold UTF-8. Les visites non confirmées restent TENTATIVE dans l’agenda. Pas de synchronisation OAuth ni d’inscription externe automatique.

Correction partagée : bornes de journée Toronto sur les changements d’heure (23/25 h), validées sans altération des rendez-vous. Déploiement et connexion sur le site utilisateur restent non vérifiés.

## Lot OMEGA du 14 octobre 2026

Priorités natives en snapshot PostgreSQL : retards réels (début sans démarrage ou fin dépassée), confirmations, visites confirmées sans créneau, suivis échus, factures natives et échecs du worker. Les droits déterminent les catégories et les compteurs ; dix dossiers maximum par catégorie, compte exact avant limite. Le briefing reprend ce périmètre dans l’assistant.

Analyse de journée en lecture seule : équipe active, objectifs lundi-jeudi/vendredi, visites existantes, créneaux hypothétiques de 60 minutes entre 8 h et 17 h avec marge de 30 minutes. Les créneaux incomplets sont bloquants. Le bouton de préparation reporte uniquement la date au planificateur ; aucune réservation ou plan créé automatiquement.

Limites explicites : règles déterministes, aucun modèle de langage connecté, aucun itinéraire routier calculé, pas de communication ou débit externe. Les attributions des conversations, horaires individuels et comparaisons de scénarios restent TODO.

Périmètre : les deux directives fournies le 13 octobre 2026, appliquées au CRM existant. Les objectifs V1000 ne sont pas une déclaration de fonctionnalités terminées.

États : TODO (à faire), IN_PROGRESS (en cours), BLOCKED (prérequis absent), TESTING (validation en cours), DONE (implémenté), VERIFIED (validation correspondante réussie).

| Priorité | Travail | État initial | Critère de validation |
| --- | --- | --- | --- |
| P0 | Récupérer les développements pertinents | DONE | SMS e17a7ad, Rotorlive ed80979 et thème sombre cf82ea0 |
| P0 | Réunir Stripe, SMS et appels dans le CRM | VERIFIED | Interface, API, droits et tests PostgreSQL/HTTP |
| P0 | Associer les communications aux clients uniques et signaler les ambiguïtés | VERIFIED | Aucun rapprochement automatique de numéros ambigus |
| P0 | Historique fournisseur et pagination | VERIFIED | Recherche serveur, stabilité et permissions |
| P0 | OMEGA : préparer les brouillons locaux de communications | VERIFIED | Actions supervisées et idempotence, zéro envoi externe |
| P0 | Vérifier les connexions Stripe/Twilio/Rotor réelles | BLOCKED | Accès privé valide et contrôles en lecture seule |
| P0 | Déploiement Render avec PostgreSQL existant | BLOCKED | Variables privées configurées, santé et parcours authentifié |
| P1 | Relier les espaces fournisseurs aux dossiers clients | VERIFIED | Visibilité restreinte et navigation réelle |
| P1 | Stripe réel, remboursements et rapprochement comptable | BLOCKED | Architecture, tests et activation de production explicitement validée |
| P1 | Horaires configurables et simulation de routes | TODO | Disponibilités, conflits concurrents et explications |
| P1 | Import/synchronisation Rotor au-delà des archives | BLOCKED | Capacités OAuth réellement accessibles, conflits et provenance |
| P2 | Recherche, vues direction/vente/opérations/finances | TODO | Sources réelles et permissions |
| P2 | Hors ligne et synchronisation mobile | TODO | Données cloisonnées, conflits et purge après déconnexion |
| P2 | Téléphonie navigateur, audio et messagerie vocale | BLOCKED | Infrastructure Voice, consentements et numéro contrôlé |

Pas de quota artificiel de tests : couvrir les cas réels, compter les vérifications exécutées, ne pas annoncer 2 000 ou 400 tests sans preuves.

Cette tranche fournit des suggestions locales, pas un éditeur complet d’automatisations ni une synchronisation bidirectionnelle. Les suivis persistants sont VERIFIED dans le second lot : validation humaine, déduplication, versions, STOP, état source, note et audit ; 13 groupes navigateur réussis. Les objectifs par technicien lundi-jeudi/vendredi sont désormais configurables et VERIFIED. L’attribution des conversations, la messagerie vocale, les horaires variables et simulations routières restent TODO. Les connexions réelles restent BLOCKED.
