# Politique OMEGA — état livré

Mise à jour du 14 octobre 2026 : le [superviseur natif](OMEGA_SUPERVISOR.md) ajoute quatre scénarios configurables, des missions persistantes, reprise par curseur, décisions humaines et arrêt immédiat. Le cycle ne confirme aucune visite, n'envoie aucune communication et ne touche pas au registre financier. Les commissions annuelles rétroactives sur ventes signées hors taxes sont désormais livrées dans le leaderboard ; les paragraphes historiques ci-dessous ne décrivent pas cette fonction récente.

OMEGA est actuellement un planificateur déterministe, pas un modèle d’IA général. Ses préparations résident dans PostgreSQL, avec déduplication par période, états, tentatives, erreurs bornées, reprise et kill switch. Le moteur est désactivé par défaut.

Il observe et propose des affectations de visites déjà confirmées. L’application vérifie les horaires de Toronto (lundi–vendredi, 08–17), durées, chevauchements, capacités des techniciens et versions des données. Le vendredi a une cible de deux visites ; les autres jours quatre. La marge de déplacement est fixe : elle ne constitue pas un temps routier réel.

Appliquer une proposition requiert une approbation et une revalidation transactionnelle. Les permissions des comptes sont vérifiées côté serveur. Le rôle OMEGA interne ne peut effectuer les opérations financières réservées aux humains. Aucun SMS, paiement, écriture Rotor ou réservation distante n’est réalisé par le worker.

La surveillance Rotor est un second chemin de lecture explicitement activable : snapshots des outils et alerte d’incompatibilité. Elle n’approuve pas de schéma changé, ne change pas le code et ne met pas à jour la production. Elle ne doit pas être présentée comme un OMEGA Maintenance autonome complet.

Les futurs agents Sales, Finance, Router, Customer Care et Supervisor exigent des règles précises, des adaptateurs autorisés et des preuves d’exécution. La grille de commission candidate 20/25/30/35/40 % n’est pas appliquée sans approbation et règles de calcul. Le nombre de pins « Made Sale » ne sert jamais à calculer une commission encaissée.

## Assistant V30

Les demandes de contrats actifs, visites non confirmées, passages restants et factures impayées sont des requêtes métier déterministes. Elles consultent PostgreSQL et émettent un événement d’audit sans mutation des dossiers. Finance reste un droit distinct. La demande de route conduit au choix de date et à une proposition ; l’application reprend les approbations et protections existantes. SMS, appels, courriels et commissions sont déclarés non connectés pour ces actions. Aucun AUTOPILOT ou modèle IA de langage activé.
