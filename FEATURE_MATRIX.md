> Mise à jour : la branche pilote est fusionnée dans main. La carte Google est sélectionnée avec sa clé au build ; sans clé, la carte existante reste active. Les mentions de branche pilote ci-dessous décrivent les validations historiques, pas un déploiement Vercel confirmé.

# État fonctionnel de ce lot

| Fonction | État |
|---|---|
| SDK officiel Google Maps en prospection | Implémenté ; validation réelle bloquée par clé absente |
| Roadmap / satellite / hybride, Street View, plein écran | Contrôles SDK ; à valider avec clé |
| Portes natives, groupes et territoires | Adaptés au rendu Google ; serveur existant conservé |
| Liste sans clé, recherche serveur, pagination | Disponible ; test navigateur dédié |
| Création / modification manuelles, restrictions vendeurs | Conservées |
| Recherche Places et calcul Routes / ETA | Non implémentés dans ce lot |
| Autres cartes Leaflet | Migration restante |
| Liste prospects dense, tri et pages 10/25/50 | Implémentés sur les données chargées ; API existante limitée à 1 000 prospects |
| Parité visuelle complète des 29 captures | Incomplète : 29 reçues et référencées dans SCREENSHOT_MATRIX.md |
| OMEGA | Missions internes supervisées existantes ; pas d’autonomie externe nouvelle |
| Campagnes | Aucun envoi ni activation automatique |
| Stripe / Twilio | Intégrations existantes ; aucune validation réelle nouvelle |

| Horaires d’entreprise | Semaine enregistrée, jours fermés, validation serveur, droits ADMIN et version concurrente ; sans modification des disponibilités techniciens |
| Paramètres : navigation Entreprise, équipe, rôles, Stripe, intégrations, données | Implémentée sur les modules natifs ; filtres utilisateurs et retour au CRM |

| Fiche entreprise complémentaire | Site Web HTTP(S), nom interne et description de 160 caractères persistés ; pas de sous-domaine portail ni aperçu public automatique |
