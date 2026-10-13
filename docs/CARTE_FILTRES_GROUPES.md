# Carte : filtres serveur et regroupement des portes

La recherche par adresse/notes et les filtres d'état, catégorie, vendeur, territoire et dates sont exécutés dans PostgreSQL avant pagination. Ils trouvent donc les portes qui n'étaient pas dans la première page de 100. Les statistiques par catégorie et le total correspondent à tous les résultats autorisés de ces filtres, pas seulement aux marqueurs déjà chargés.

Les dates suivent le calendrier de Toronto, de minuit inclus à minuit du lendemain exclu, y compris les journées de 23 ou 25 heures. Les dates invalides et intervalles inversés sont refusés. Les caractères %, _ et barre oblique inverse restent littéraux dans la recherche. Le filtre vendeur ne permet pas de consulter les portes d'un autre compte sans le droit map.all.

Les changements de filtre déclenchent une lecture après une courte temporisation. Une réponse provenant d'anciens filtres ne remplace pas les résultats courants ; le chargement d'une page supplémentaire attend que ces filtres aient été appliqués. Le curseur date de création / identifiant est conservé.

**Regrouper les portes proches** réunit les pins natifs chargés dans des cellules de 60 pixels du plan projeté. Cliquer sur un groupe agrandit la carte, sans ajouter une porte. Au zoom 18 les portes redeviennent individuelles ; on peut aussi décocher le regroupement. La liste et les fiches restent utilisables à tout niveau de zoom.

Les groupes représentent uniquement les pins natifs déjà chargés. Charger d'autres pages étend cette représentation. Les compteurs serveur portent, eux, sur tous les résultats filtrés. Le calque Rotor reste séparé, en lecture seule et sans regroupement dans cette livraison. Les territoires, les protections Never Knock et le parcours vendeur restent conservés.

Aucune géolocalisation des vendeurs en continu, aucun géocodage, aucun calcul d'itinéraire, aucune agrégation cartographique côté serveur par zone visible. Le fond OpenStreetMap demeure dépendant de son accès réseau ; la liste et les filtres serveur fonctionnent même si les tuiles ne chargent pas. Aucun revenu ou commission déduit de ces compteurs.

Validation : tests/map-query.test.ts (propriété, recherche hors première page, statistiques, dates et groupes), tests/browser-map-filters.mjs (interface mobile et comportement des groupes), ainsi que les tests existants d'utilisateurs/carte et de territoires. Fixtures dans des bases séparées, sans modification de données réelles.
