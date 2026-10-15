# Accès au CRM et intégration agenda

## Accès Vercel

Préférer le domaine principal https://coo-proclair.vercel.app. Une adresse de déploiement contenant un identifiant correspond à une version précise ; elle ne change pas lors des prochains déploiements.

Le compte principal utilise l’identifiant `admin` et le mot de passe privé `PROCLAIR_ADMIN_PASSWORD` configuré sur l’hébergement. Les utilisateurs d’équipe utilisent leur identifiant propre. Le code ne réinitialise ni ne remplace un mot de passe existant.

Corrections : l’origine configurée accepte le slash final, l’adresse exacte `VERCEL_URL` est reconnue lorsque `VERCEL=1`, et les cookies sont sécurisés derrière un proxy HTTPS. Les autres domaines de prévisualisation restent refusés. Les en-têtes forwarded-host ne constituent jamais une nouvelle autorisation.

| Message | Action |
| --- | --- |
| Identifiants invalides | Vérifier l’identifiant. Pour `admin`, vérifier ou remplacer le mot de passe via les variables privées de Vercel, avec au moins 12 caractères. Ne pas l’envoyer dans le chat. |
| Adresse du CRM non autorisée | Ouvrir le domaine principal ; déployer la correction pour utiliser le domaine exact de la nouvelle version. |
| Adresse publique invalide | `PROCLAIR_PUBLIC_ORIGIN` doit être `https://coo-proclair.vercel.app`, sans paramètres, fragment ou chemin. Un slash final est accepté. |
| Configuration de connexion indisponible | Vérifier les variables privées dans l’environnement Vercel utilisé : Production ou Preview. `PROCLAIR_SESSION_SECRET` nécessite au moins 32 caractères ; conserver sa valeur existante pour préserver les autorisations chiffrées Rotor. |
| Trop de tentatives | Attendre une minute avant de réessayer ; la protection distribuée PostgreSQL reste active. |

Après une modification des variables, redéployer : une ancienne URL immuable garde son ancien code et sa configuration. La présence de ces variables dans l’environnement de développement ne prouve pas leur présence chez Vercel. Aucune valeur sensible n’est stockée dans Git.

## Google Agenda, Outlook et Apple Calendar

Dans **Intégrations**, choisir les dates de Toronto et télécharger le planning `.ics`. Importer ce fichier dans l’agenda professionnel. Aucune clé API ni autorisation OAuth supplémentaire nécessaire.

Période maximale : 31 jours ; plafond : 2 000 rendez-vous, avec refus d’export partiel au-delà. Les rendez-vous annulés ou à replanifier sont exclus. Les créneaux incomplets ou invalides sont omis avec un compteur explicite. Export protégé par les droits Intégrations, lecture CRM et export, sans cache public ; les vendeurs ne reçoivent pas le planning global.

L’import est ponctuel, sans synchronisation automatique ni propagation des suppressions. Les UID natifs sont stables et les versions présentes, mais le traitement des mises à jour/doublons dépend du logiciel destinataire. Le fichier contient les noms et adresses des rendez-vous. Aucune inscription à un agenda externe ou notification n’est exécutée par le CRM.
