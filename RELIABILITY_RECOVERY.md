# Remise en état de la validation CRM — 16 octobre 2026

Base : `develop` au commit `268c55e`. Branche : `fix/proclair-full-crm-reliability`.
L’audit `audit/full-crm-browser-20261016` a été inspecté : son seul ajout est l’exécution des quinze suites manquantes. Le catalogue reprend ses 32 suites sans reprendre les étapes `continue-on-error`. Le lanceur collecte tous les résultats, puis retourne une erreur si une seule suite échoue.

## Causes reproduites

| Suite | Cause vérifiée | Correction |
|---|---|---|
| `test:e2e` | Aucun technicien dans la base vierge. La proposition persistée était vide et le test attendait une visite. La date dépendait aussi de l’horloge. | Technicien synthétique explicite, lundi fixe `2027-01-11`, assertions sur la proposition, l’application et la visite persistée, puis vérification de la même visite dans les trois vues. |
| `test:integrations:e2e` | Le mock global des routes d’intégration renvoyait un objet OAuth aux API auxiliaires ; erreur JavaScript `undefined.map` et écran non chargé. | Interception limitée aux quatre routes du cycle OAuth ; schémas natifs des autres API conservés. Renouvellement, annulation, refus puis succès de révocation simulés, absence d’autorisation réelle persistée vérifiée. |
| `test:compatibility:e2e` | `NOT_CONNECTED` ne correspondait plus au contrat de santé : configuration, autorisation et vérification sont distinctes. Le sélecteur de scopes incluait d’autres formulaires et les filtres étaient vérifiés avant leur réponse. | Assertions explicites `NOT_CONFIGURED`, `NOT_AUTHORIZED`, `NOT_IMPLEMENTED`, scopes de lecture du formulaire OAuth uniquement et attente du résultat réel du filtre. |
| `test:portal:e2e` | Confirmation renommée en « Informations entreprise enregistrées. » ; le chargement du formulaire n’était pas attendu. | Attente du formulaire prêt, confirmation actuelle et vérification API des valeurs persistées. Portail testé sur ordinateur et mobile, accès anonyme au CRM refusé et lien privé révoqué rejeté. |
| `test:sales-followups:e2e` | La supervision est dans l’onglet Opérations d’OMEGA, caché à l’ouverture du centre. | Navigation par l’onglet avant la supervision. Conservation des tests de deux vendeurs, isolement des données et interdiction des contacts externes. |
| `test:v30:e2e` | Huit groupes intentionnels, dont Communications, au lieu de sept. L’assistant est dans son propre onglet et sait désormais lire les SMS déjà stockés. | Vérification des huit intitulés sans supprimer de rubrique, navigation Assistant et assertions sur l’intention réelle `ROTOR_SMS_FOLLOWUPS`, la source PostgreSQL et `executed:false`. |

## Instabilité découverte pendant la répétition

Le premier passage complet était vert. Le deuxième a exposé une course dans `browser-omega-supervisor.mjs` : la réponse simulée attendait 100 ms, mais le clic de suspension pouvait arriver après le lancement du cycle suivant. Le test exigeait alors un seul cycle alors qu’il en avait laissé démarrer deux. La simulation retient maintenant explicitement la première réponse jusqu’au clic de suspension, puis la libère. Le contrôle reste strict : un seul cycle pour la suspension, puis vingt cycles pour la borne maximale. Aucun délai global augmenté. Le passage intermédiaire en échec reste présent dans les preuves.

Aucun changement de logique métier ou de permission dans `src/`. Aucun écran factice, aucun test supprimé, aucune augmentation des délais Playwright. Les défauts reproduits concernaient les préconditions et contrats des tests ; aucune perte de visite n’a été observée dans le moteur avec une équipe disponible.

## Validation et diagnostics

- `npm run test:browser:all` exécute les 32 commandes de `tests/browser-suites.json`. Une suite déclarée dans package.json et absente du catalogue bloque le lancement.
- Une base locale nommée `proclair_browser_test` est obligatoire ; la remise à zéro des compteurs est elle-même protégée par le contrôle de séparation de la base principale.
- Chaque suite produit `suite.log`. Le lanceur écrit `results.json` et `junit.xml`, les dates, durées et empreintes SHA-256 des sources des tests.
- `tests/support/browser.mjs` capture les erreurs JavaScript, requêtes échouées et réponses HTTP >=400. Les codes attendus 401/403/404 des tests d’autorisation restent enregistrés sans devenir des faux échecs. Une erreur JavaScript inattendue rend la suite rouge.
- Les contextes sont tracés et photographiés avant fermeture, y compris lorsqu’une assertion échoue. Les adresses réseau du journal sont débarrassées de leurs paramètres. Les requêtes navigateur externes sont bloquées dans les exécutions instrumentées ; les opérations fournisseurs sont simulées.
- Le workflow conserve les rapports, captures, traces Playwright et journaux serveur pendant sept jours. Afficher les traces avec `npx playwright show-trace chemin/context-1-trace.zip`.
- Les bases utilisées pour cette remise en état appartiennent à un conteneur PostgreSQL distinct sur le port 5435. La base navigateur est recréée entre les passages complets : aucune donnée client ni migration de production.

Les résultats de chaque passage sont consignés dans `RELIABILITY_VALIDATION.json`. Les captures et traces volumineuses restent hors Git. Les fixtures appartiennent exclusivement à la base jetable ; plusieurs suites nettoient aussi leurs propres lignes en fin d’exécution.

## Livraison et limites

La livraison de ce lot vise **develop**, sans fusion automatique dans main ni déploiement de production. Aucune variable secrète, autorisation distante ou donnée réelle modifiée.

La lecture de l’issue #27 et des journaux GitHub renvoie `Forbidden` dans cet environnement. Les six erreurs ont été reproduites localement à partir de la directive ; les validations locales ne constituent pas des résultats GitHub Actions. Une publication de branche peut déclencher des vérifications distantes mais leur résultat doit être confirmé séparément.

Stripe, Twilio, Rotor/Surge et les états OAuth sont vérifiés avec des données et réponses synthétiques. Aucun encaissement, SMS, appel ou révocation distante réelle. Aucun test de routage Google réel ni de clé Google Maps en production. La disponibilité/configuration réelle des fournisseurs n’est pas attestée par ces tests.

Vercel Preview READY et les vérifications GitHub ne doivent être annoncés que lorsque leur résultat distant est effectivement accessible. L’absence d’accès API et le quota Vercel signalé par le propriétaire peuvent empêcher cette partie de la validation ; aucune production ne sera forcée pour les contourner.

La réussite des 32 suites valide les scénarios implémentés et leurs protections. Elle ne signifie pas que les 512 capacités candidates ni toute la parité des captures Rotor sont développées, ni que les fournisseurs externes sont opérationnels en production.

## Bilan local final

| Contrôle | Résultat |
|---|---|
| Installation verrouillée et génération Prisma | Réussies |
| Migrations | Base isolée, réussies ; conteneur et volume de test supprimés ensuite |
| Tests serveur | 140/140, zéro échec, zéro ignoré |
| Python | 3/3 |
| TypeScript et compilation finale | Réussis |
| Premier passage navigateur | 32/32 |
| Passage de répétition intermédiaire | 31/32 : course de suspension reproduite puis corrigée |
| Répétitions ciblées après correction | Supervision : 3/3 |
| Passage navigateur final | 32/32, zéro suite ignorée ; supervision réussie une quatrième fois |
| Production et données clients réelles | Aucune modification |
| GitHub / Preview Vercel | Non vérifiés à distance, accès API refusé / authentification Vercel absente |

Les fichiers modifiés sont les six scénarios initiaux, le scénario de supervision, les imports du collecteur commun des autres suites, le catalogue des 32 suites, le lanceur, ses deux tests de protection et le workflow. Aucune modification de `src/`, de Prisma, des dépendances ou des protections GitHub. Les preuves agrégées et empreintes figurent dans RELIABILITY_VALIDATION.json ; les traces détaillées sont sous `.local/reliability/` dans cet environnement.
