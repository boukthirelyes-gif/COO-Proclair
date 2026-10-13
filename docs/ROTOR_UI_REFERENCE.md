# Références d’interface Rotor

Aucune session privée Rotor ni capture du compte Proclair n’est fournie à cette instance. Il n’existe donc pas de mesure crédible de ressemblance pixel par pixel.

Sources officielles lues le 2026-10-13 :

- [Carte, pins et territoires](https://helpcenter.getrotor.com/articles/8977819-map-pins-and-territories) : clients, prospects et pins distincts ; visibilité de ses propres pins pour les membres ; personnalisation des catégories et couleurs au niveau de l’entreprise.
- [Carte mobile](https://helpcenter.getrotor.com/articles/7375539-mobile-maps) : filtres par membre, dates et proximité ; regroupement des marqueurs, territoires, GPS et mode satellite. Les fournisseurs diffèrent entre plateformes ; aucune bibliothèque Rotor privée n’est extraite.
- [Mises à jour de carte](https://helpcenter.getrotor.com/articles/0099754-using-map-updates-filters-territories-and-bulk-assignment) : lasso, affectation groupée, territoires actifs/inactifs et filtres de performance.
- [Crew Scheduling](https://helpcenter.getrotor.com/articles/7841990-crew-scheduling) : disponibilités par technicien, créneaux indisponibles, crews et exceptions.
- [Jobs et visites](https://helpcenter.getrotor.com/articles/6128121-visits-vs-jobs-explained) : la visite porte le travail terrain ; le job porte la facturation.
- [Pending Jobs](https://helpcenter.getrotor.com/articles/0758838-pending-jobs) : échéance de service distincte d’une réservation ferme.

Équivalent natif livré : carte Leaflet, cinq catégories de la directive, panneau latéral de détail, notes, rappel, historique, filtres par catégorie/statut/vendeur/date et visibilité par rôle. Les anciennes catégories de workflow ne sont pas présentées comme des catégories Rotor. Les cinq UUID viennent de l’administrateur et attendent une relecture autorisée pour vérifier leur configuration actuelle.

Limites visuelles : les captures Chromium du CRM valident sa propre interface desktop/mobile, pas une fidélité à des écrans Rotor privés. Les tuiles OpenStreetMap sont bloquées par le proxy Codex actuel. Satellite, clusters, lasso, territoires polygonaux et géocodage ne sont pas livrés. Aucun bouton prétendument opérationnel ne simule ces fonctions.
