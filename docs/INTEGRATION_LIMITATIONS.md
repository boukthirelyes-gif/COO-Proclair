# Limites des intégrations — état vérifiable

| Chemin | Implémentation | Vérification externe |
| --- | --- | --- |
| Production coo-proclair.vercel.app | Cible fournie par l’administrateur | Accès réseau refusé dans cette instance ; aucune santé production attestée |
| Rotor OAuth/MCP | Consentement progressif en lecture, tokens chiffrés, découverte et snapshots | Métadonnées publiques lues ; aucun token du compte disponible ici |
| Clients/jobs/visites Rotor | Pages prévisualisées et miroir indépendant | Fixtures/mock ; aucun import de clients réels exécuté ici |
| Pins Rotor | Schéma d’arguments courant, prévisualisation et import de page idempotent | Fixture/mock ; consentement pins:read et découverte réels requis |
| Catégories Proclair | Cinq noms/couleurs/UUID fournis, provenance conservée | USER_PROVIDED_REFERENCE initialement ; VERIFIED_ROTOR_MCP seulement après lecture réussie |
| Stripe | Non connecté | Pas de clé test, consentement Stripe ou webhook fourni |
| SMS, courriel, appels | Non connectés | Aucun message ni appel envoyé ; aucun fournisseur autorisé accessible |
| Fond de carte | Leaflet + OpenStreetMap | tile.openstreetmap.org refusé par le proxy Codex ; liste/pins utilisables |
| Itinéraires et satellite | Non implémentés | Aucun fournisseur de matrice routière ou imagery validé |
| Commission | Grille candidate fournie dans la directive | Non activée : approbation et règles d’attribution nécessaires |

Les accès ChatGPT, Rotor et OAuth de l’application sont indépendants. Aucune réutilisation de tokens ni extraction de credentials n’est tentée. Aucune écriture Rotor, création de campagne ou paiement n’est déclenché par cette livraison.

L’import de pins conserve GPS, notes, dates et références reconnues. Un format inconnu ou des coordonnées manquantes sont rejetés. Le miroir n’affecte pas les objets locaux et ne supprime rien sur la base d’une page incomplète. Les membres Rotor ne sont pas automatiquement assimilés aux comptes Proclair : le miroir de pins reste réservé aux administrateurs jusqu’à rapprochement vérifié.

Pour continuer : consentement OAuth depuis Intégrations avec pins:read, découverte des outils, actualisation des catégories, prévisualisation puis import explicite. Les scopes de lecture supplémentaires sont sélectionnables sans activer d’adaptateur métier absent. Les variables Vercel existantes restent nécessaires ; aucune nouvelle clé privée n’est requise pour ces modules.
