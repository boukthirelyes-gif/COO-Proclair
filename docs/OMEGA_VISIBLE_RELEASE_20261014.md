# Livraison interface OMEGA — 14 octobre 2026

La livraison reprend ef74247, dernier lot natif validé, et ajoute la liste des
prospects précédemment livrée en branche de test. Google Maps reste sur sa branche
pilote : aucune dépendance à une clé Google n’est ajoutée à cette livraison.
La carte de prospection existante et ses catégories, territoires, permissions et
restrictions sont conservés.

OMEGA dispose de quatre espaces : Missions, Opérations, Planning, Assistant.
Les activités visibles suivent les droits du compte. La navigation au clavier
prend en charge les flèches, Début et Fin. Les liens de l’assistant et des priorités
ouvrent l’espace cible avant de déplacer le focus. Les composants gardent leurs
états lorsqu’on change d’espace. Aucun scénario, moteur ou fournisseur n’est activé.

Les cartes, propositions, dialogues et zones de sélection utilisent le thème
charbon de Proclair, avec texte lisible et accents orange. La liste prospects
propose les coordonnées, statuts de contact, tri, pages 10/25/50 et noms fixes sur
mobile. La pagination prospects reste locale au résultat chargé, avec le seuil
serveur explicite existant de 1 000 prospects ; aucune troncature silencieuse.

Validation : compilation et TypeScript réussis, 127 tests métier sans échec ni
ignoré ; 25 contrôles superviseur, 10 opérations, 6 espaces/contraste/focus/mobile,
7 tableau prospects et 27 étapes du parcours CRM/planning complet. Le contraste mesuré du libellé d’indicateur est 11,99:1.
Les suites métier et navigateur utilisent leurs bases séparées. Zéro appel aux
fournisseurs, aucune opération sur les clients ou paiements de production.
Les nouvelles suites navigateur sont enregistrées dans la CI existante.

Publication : un envoi sur GitHub/main ne prouve pas Vercel Ready. Aucun jeton,
projet local Vercel ou deploy hook n’est disponible ici. La connexion HTTPS au site
est refusée par le proxy de sortie (CONNECT 403), pas par une réponse de l’app.
Le build Vercel doit être pris depuis main, avec les variables existantes et les
migrations additives du lot ef74247. Contrôler dans Vercel Deployments le commit
publié et le statut Ready ; l’interface attendue porte « Centre de contrôle OMEGA »
et les quatre onglets. Aucun domaine ou lien Preview nouveau n’est inventé.
