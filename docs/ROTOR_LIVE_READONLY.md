# Les mêmes SMS et paiements que Rotor — lecture directe sécurisée

## Ce qui est ajouté
- **Messages Rotor** : lit les SMS réellement reçus/envoyés par la boîte Rotor, dont le fournisseur actuel est **Surge** ; ne requiert pas de clé Twilio pour cette lecture.
- **Paiements** : liste les paiements tels que Rotor les expose (Stripe, Interac et autres méthodes), avec leur statut et leur référence. Ne refait pas de prélèvement.
- **Factures** : liste les factures et statuts de Rotor à côté des fonctions natives Proclair.
- Lecture page par page de 25 éléments, sans copie de transaction dans le registre comptable natif. Aucune base locale n'est modifiée par cette lecture.

Les **780 paiements**, **3 437 messages SMS** et **882 factures** vus dans une session ChatGPT le 13 octobre 2026 montrent que les outils Rotor les exposent au compte Proclair. Ce sont des totaux ponctuels, pas une preuve que le CRM déployé possède déjà son propre consentement OAuth. Le CRM doit se connecter **séparément** au compte Rotor.

## Étapes d'activation dans le CRM déployé
1. Configurer la production Vercel (PROCLAIR_PUBLIC_ORIGIN = HTTPS réel, base PostgreSQL et session secret existants) et déployer cette branche après revue de la PR. Ne pas toucher aux clés Stripe/Twilio existantes simplement pour la lecture Rotor.
2. Ouvrir le CRM > **Intégrations** > **Rotor**.
3. Cliquer sur **Sélectionner SMS + paiements + factures** ; conserver les autres autorisations utiles et **Connecter/Reconnecter Rotor** pour consentir aux scopes `inbox:read`, `payments:read`, `invoices:read`.
4. Dans **Messages Rotor**, **Paiements** et **Factures**, ouvrir la première page puis utiliser **Suivant** ou **Actualiser**. Chaque page est lue à la demande, pas synchronisée en arrière-plan.
5. Si Rotor refuse la connexion, vérifier le retour OAuth configuré, la disponibilité des outils et les autorisations accordées. L'accès ChatGPT ne fournit pas de clé secrète réutilisable au CRM.

## Garantie d'intégrité
- Toutes les requêtes sont des opérations MCP de **lecture**, dans une liste blanche de trois noms: `list_messages`, `list_payments`, `list_invoices`.
- Pas de création de factures locales, pas de règlement local, pas d'envoi SMS, pas de webhooks de production ni d'appel Stripe direct.
- Les onglets financiers exigent la permission interne `finance` ; les SMS exigent `crm.read` ; le serveur vérifie en plus les scopes Rotor. Les résultats sont marqués `READ_ONLY_LIVE`, privés et non mis en cache.
- Les messages sont affichés comme texte React, jamais interprétés comme HTML. Les champs fournisseurs inutiles sont écartés, et les pages sont plafonnées.
- Les listes locales ne doivent pas être additionnées aux paiements Rotor, pour éviter les doubles comptabilisations.

## Ce qui reste bloqué
- Rotor n'expose pas à cette intégration d'outil autorisé pour **envoyer un SMS individuel** ou **créer directement un paiement Stripe Rotor**. Ne pas les simuler via Twilio ou un autre compte.
- Aucune écriture bidirectionnelle, création/annulation de visite Rotor, synchronisation de messages en arrière-plan ni traitement d'appels/voicemails n'est ajoutée ici.
- Les outils en ChatGPT ont été vérifiés, mais la connexion OAuth réelle **depuis la production Vercel** et les tests bout-à-bout de cette branche n'ont pas été attestés. N'activer aucune écriture financière avant tests dédiés.

## Vérification après déploiement
- Les API GET `/api/integrations/rotor/live/payments?page=1&limit=25`, `/sms`, `/invoices` répondent avec `source: ROTOR`, `mode: READ_ONLY_LIVE` lorsque le consentement et les droits sont valides.
- Sans session CRM, réponse 401. Sans scope Rotor adéquat, réponse 403 avec directive de reconnexion. Une opération POST n'exécute **aucun outil métier Rotor**.
- Exécuter `npm run typecheck`, `npm test` et `npm run build` dans un environnement équipé des dépendances ; tester les nouvelles pages et l'identité du compte source sur un déploiement Preview isolé.
