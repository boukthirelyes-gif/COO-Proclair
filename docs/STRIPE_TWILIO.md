# Stripe et Twilio dans Proclair

## Livraison du 13 octobre 2026

Les SDK officiels sont intégrés au CRM existant. Dans **Intégrations**, une carte indique les variables manquantes et les adresses de webhook, puis l'historique des SMS et des appels. Dans **Paiements**, le module Stripe permet de créer un lien Checkout **de test** à partir d'une facture émise et encore impayée.

Une configuration présente n'est pas une connexion vérifiée. Aucun compte fournisseur n'a été testé : les clés sont absentes de l'environnement de développement. Les validations utilisent des signatures du SDK et des transports simulés, avec PostgreSQL réel dans un schéma de test séparé. Aucune communication externe et aucun débit bancaire ne sont exécutés par les tests.

## Variables Vercel, exclusivement serveur

Conserver les six variables déjà décrites dans [deploy-vercel.md](deploy-vercel.md). Ajouter les suivantes dans les paramètres Vercel, sans préfixe `NEXT_PUBLIC_` et sans les communiquer dans le chat :

| Variable | Usage |
| --- | --- |
| `STRIPE_SECRET_KEY` | Clé `sk_test_…` du compte Stripe de test ; les clés réelles sont refusées |
| `STRIPE_WEBHOOK_SECRET` | Secret de signature du webhook Stripe de cet environnement |
| `TWILIO_ACCOUNT_SID` | Compte Twilio auquel appartient le numéro |
| `TWILIO_AUTH_TOKEN` | Validation des signatures et API d'envoi |
| `TWILIO_PHONE_NUMBER` | Numéro Twilio au format E.164, par exemple `+15145550000` |
| `TWILIO_SEND_ENABLED` | `false` par défaut ; `true` autorise uniquement les envois individuels approuvés dans l'interface |
| `TWILIO_VOICE_ENABLED` | `false` par défaut ; `true` autorise le transfert des appels entrants |
| `TWILIO_FORWARD_TO` | Destination E.164 du transfert ; aucune boucle vers le numéro Twilio ou l'appelant |

`PROCLAIR_PUBLIC_ORIGIN` doit être l'origine HTTPS exacte, sans chemin, paramètres ou fragment. Redéployer après modification. Utiliser des comptes/secrets/numéros et bases distincts entre Preview et production. Ne pas activer les deux drapeaux Twilio avant de vérifier les coûts, le numéro et les destinataires choisis.

## Configuration Twilio

Les adresses exactes apparaissent dans Intégrations dès que l'origine HTTPS est valide. Configurer les requêtes en **POST**, sans paramètres ajoutés dans l'URL :

- Réception SMS : `/api/webhooks/twilio/sms`.
- Statut des SMS : `/api/webhooks/twilio/status` ; automatiquement attaché aux envois du CRM.
- Réception des appels : `/api/webhooks/twilio/voice`.
- Call status callback : `/api/webhooks/twilio/calls` ; sélectionner les étapes disponibles, dont completed. Le transfert Dial utilise aussi cette adresse pour son résultat.

Tous les webhooks vérifient `X-Twilio-Signature` sur l'URL HTTPS canonique et les champs originaux, puis l'identité du compte. Les cookies CRM ne sont pas demandés sur ces seules routes signées. Corps bornés, champs dupliqués refusés, identifiants SMS uniques et états terminaux conservés. Les callbacks arrivant avant la réponse de création d'un SMS sont conservés puis réconciliés.

Activer **Advanced Opt-Out** sur la configuration Twilio applicable : STOP et `OptOutType=STOP` retirent le consentement, `OptOutType=START` permet une réinscription authentifiée du destinataire. Un administrateur ne peut pas annuler un STOP par la saisie d'une preuve. Un simple texte START dépourvu du signal Twilio ne réinscrit pas automatiquement.

L'envoi requiert une preuve de consentement, les droits `integrations` et `crm.write`, une approbation individuelle et le drapeau d'activation. Consultation : `integrations` et `crm.read`. Ces droits ne sont pas ajoutés aux vendeurs : les conversations ne sont pas encore affectées à des propriétaires. L'historique est limité aux 100 derniers éléments, avec filtre local. Les corps sont affichés comme du texte, sans HTML et sans rapprochement automatique des téléphones avec des clients ambigus.

Un résultat réseau incertain est conservé `UNKNOWN_REVIEW_REQUIRED` et **n'est pas réessayé automatiquement** : Twilio Messages ne fournit pas une garantie d'idempotence de création comparable à Stripe. Vérifier la console Twilio avant toute nouvelle clé d'envoi.

Si le transfert vocal est désactivé, le webhook vocal répond occupé. Ne pas remplacer un routage téléphonique existant par cette adresse avant d'avoir décidé ce comportement. Aucun appel sortant, enregistrement, messagerie vocale ou transcription IA n'est activé. Les pièces jointes MMS et un rapprochement explicite avec les dossiers clients restent à développer.

## Configuration Stripe

Créer un webhook dans le **mode test** Stripe avec les événements :

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

Adresse : `/api/webhooks/stripe`. Utiliser le secret propre à ce webhook ; celui de Stripe CLI est différent. La signature est contrôlée sur le corps brut avec la tolérance temporelle du SDK. Les événements réels sont refusés. Les identifiants événements sont uniques, les callbacks rejoués sont sans effet, et le lien, montant, devise et référence doivent correspondre au Checkout enregistré.

Les liens sont hébergés par Stripe : Proclair ne reçoit aucune donnée complète de carte. Les créations réutilisent une clé Stripe stable ; conserver la même clé lors d'un échec réseau. Une préparation âgée de plus de 23 heures exige une vérification avant toute recréation. Les liens expirent après 30 minutes.

Un paiement réussi est affiché **PAID_TEST** et ne crée aucun paiement dans le registre comptable, ne règle aucune facture et ne déclenche aucune commission. Pour accepter de vrais paiements, il reste à livrer et valider une réconciliation du registre, le traitement des remboursements/litiges et l'activation de production autorisée. Aucun mandat bancaire, abonnement, remboursement ou prélèvement réel dans cette livraison.

## Sauvegarde et validation

Migration additive `20261013180000_provider_events`, sans modification des données existantes. L'export natif inclut les SMS, consentements, appels et références Stripe ; il exclut les URL Checkout et les secrets fournisseur. Les journaux de webhook ne publient ni corps, ni signatures, ni erreurs SDK susceptibles d'exposer des données.

Tests : `tests/providers.test.ts` (signatures et stockage PostgreSQL) et `tests/browser-providers.mjs` (interface, autorisations et refus d'envoi sans configuration). Les comptes et événements simulés ne constituent pas une preuve de connexion en production.

### Améliorations de configuration et de consultation

La carte de connexion signale les formats SID/numéro incorrects et les clés Stripe incompatibles, sans exposer leurs valeurs. Un bouton actualise le diagnostic et les adresses de webhooks peuvent être copiées. L'état d'activation SMS exige une configuration complète ; une destination vocale incorrecte désactive le transfert affiché sans désactiver le diagnostic SMS. Cette validation de forme ne prouve pas une authentification auprès du fournisseur.

L'historique affiche les dates dans le fuseau America/Toronto et les états en français. La recherche filtre aussi les appels. Le retrait explicite du consentement est disponible avec une preuve saisie ; la protection STOP demeure applicable.

### Vérification des comptes depuis le CRM

Dans Intégrations, **Tester la connexion Stripe** lit le compte propriétaire de la clé `sk_test_…` avec le SDK officiel. **Tester la connexion Twilio** lit l'état du compte et, si un numéro valide est configuré, vérifie sa présence dans ce compte. Ces lectures ne créent aucun Checkout, SMS, appel ou débit. Aucun identifiant complet, jeton ni contenu d'erreur du SDK n'est renvoyé au navigateur.

La vérification nécessite `integrations`. Elle peut fonctionner avant la configuration du webhook ou de l'origine publique si les identifiants nécessaires sont présents. Son résultat est daté dans le fuseau Toronto et ne remplace pas la réception d'un événement signé : les webhooks restent affichés comme non vérifiés. L'état suspendu/fermé et un numéro absent sont signalés sans activer automatiquement les envois. Le résultat visible est effacé à l'actualisation de la configuration.

Une réponse 401/403 signifie un refus d'identifiants ; une erreur réseau ou fournisseur ne confirme aucun résultat d'authentification. Les journaux contiennent uniquement le fournisseur, l'issue et l'acteur, sans erreur privée. Sans clés, le contrôle reste indisponible et les noms de variables à configurer sont affichés. Les clés doivent être ajoutées dans Vercel, puis le projet redéployé. Les comptes réels n'ont pas été vérifiés dans cet environnement.
