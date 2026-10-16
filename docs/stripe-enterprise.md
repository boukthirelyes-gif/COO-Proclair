# Stripe Enterprise — Mission 3

Le module existant conserve la démonstration historique et ajoute un rapprochement natif distinct. Les anciennes transactions ne sont jamais converties automatiquement en règlements.

## Configuration

TEST utilise STRIPE_TEST_SECRET_KEY et STRIPE_TEST_WEBHOOK_SECRET (compatibilité avec les anciennes variables TEST). LIVE utilise exclusivement STRIPE_LIVE_SECRET_KEY et STRIPE_LIVE_WEBHOOK_SECRET. Les secrets webhook doivent être distincts. Aucun secret n'est exposé au navigateur.

Les paiements LIVE restent bloqués par défaut : STRIPE_LIVE_PAYMENTS_ENABLED=false. Leur activation nécessite une autorisation explicite du propriétaire, une référence d'autorisation STRIPE_LIVE_APPROVAL_REFERENCE et une recette séparée. Cette mission ne les active pas.

Configurer les endpoints signés `/api/webhooks/stripe?mode=TEST` et `/api/webhooks/stripe?mode=LIVE` avec leurs secrets respectifs. Événements : checkout.session.completed, checkout.session.expired, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, payment_intent.succeeded, payment_intent.payment_failed, refund.created, refund.updated, refund.failed et charge.refunded. Les événements non pertinents sont journalisés sans règlement.

## Règles

Les factures historiques restent LIVE. Les factures synthétiques TEST portent un numéro TEST-PC et sont exclues des totaux métier LIVE. Chaque paiement et remboursement porte son mode. L'administration finance et intégrations est requise.

Un lien actif réserve la facture entière contre les liens concurrents et les règlements manuels. Un refus de carte conserve cette réservation puisque le lien permet une nouvelle tentative. L'expiration doit être confirmée par rapprochement serveur ou webhook signé. En cas de panne ambiguë, réutiliser la même clé ; après 23 heures sans identifiant fournisseur, une revue est obligatoire.

Le retour navigateur ne règle jamais une facture. Le serveur relit Checkout et PaymentIntent, vérifie CAD, montants exacts, mode, identité de facture et métadonnées avant de créer un paiement unique. Les reçus et décisions webhook sont immuables au niveau PostgreSQL. Les événements dupliqués ou anciens ne régressent pas un règlement confirmé.

Les remboursements partiels sont réservés avant l'appel Stripe ; seul un remboursement confirmé relu chez Stripe réduit le montant net. La facture retrouve un solde dû. Cela ne constitue pas une émission automatique d'avoir comptable. Les paiements initiaux ne sont pas modifiés. La contrepassation manuelle des paiements Stripe est interdite.

## Rapports et limites

Le tableau de bord présente transactions, factures, soldes clients paginés, brut, remboursements et net par mode, historique des événements et export JSON. Il rapproche le registre client, pas les versements bancaires Stripe : aucun solde bancaire n'est certifié. Les listes sont paginées ; l'export contient la page sélectionnée et les totaux globaux du filtre.

Les tests utilisent un SDK Stripe simulé et des signatures HMAC de test avec PostgreSQL isolé. Ils ne prouvent pas une recette sur un compte Stripe officiel ni un déploiement distant. Une recette officielle TEST et la vérification des endpoints hébergés restent nécessaires avant autorisation LIVE. Un événement charge.refunded contenant plus de 100 remboursements reste en erreur de revue plutôt que de rapprocher une liste incomplète.
