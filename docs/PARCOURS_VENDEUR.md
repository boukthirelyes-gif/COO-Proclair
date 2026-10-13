# Vente native : porte, devis, contrat, signature et planification

## Utilisation

1. Dans la carte, ouvrir sa porte et choisir **Créer un prospect depuis cette porte**. Compléter le nom et l'adresse, puis enregistrer le prospect.
2. Ouvrir ce prospect et choisir **Préparer un devis ou contrat**, ou ouvrir **Mes ventes**.
3. Préparer son devis en dollars CAD, préciser sa validité, puis l'émettre. Partager personnellement le lien privé avec le client. Le portail existant consigne son nom et son consentement.
4. Après acceptation, actualiser ses ventes et choisir **Créer le contrat du devis**. Les services et prix sont préremplis. Décrire les passages et conditions ; les totaux doivent conserver ceux du devis accepté.
5. Émettre le contrat puis faire signer le client sur son téléphone, dans le portail de contrats existant. Le PDF signé est archivé et téléchargeable.
6. Choisir **Transmettre à la planification**. Le prospect passe à l'étape Gagné lorsque son pipeline possède cette étape. La porte encore détenue par le vendeur passe à Vendu / Made Sale, avec audit ; une porte réaffectée n'est pas modifiée.
7. Un responsable autorisé retrouve le contrat dans **Contrats**, puis crée explicitement les passages à confirmer. Les visites restent PENDING, sans technicien et sans heure ; confirmation et planification suivent le parcours existant.

Un contrat direct depuis le prospect reste possible. L'accord sur le devis et l'accord sur le contrat sont distincts. Aucun client n'est invité ou contacté automatiquement.

## Accès et restrictions

Le nouveau droit **sales.write — Devis et contrats de ses prospects** requiert leads.read. Il permet de créer et émettre des devis/contrats personnels, consulter leurs PDF, modifier leurs brouillons, révoquer les liens de contrats et transmettre une vente signée. Il n'autorise ni la consultation globale des clients, ni le registre financier, ni l'affectation d'interventions.

Le rôle Vendeur proposé pour un **nouveau** compte inclut ce droit. Les comptes non administrateurs existants ne reçoivent aucun accès supplémentaire automatiquement : un administrateur doit cocher ce droit dans Utilisateurs. La migration ajoute ce droit aux administrateurs, dont le rôle conserve toutes les permissions, et invalide leurs sessions enregistrées si nécessaire. Le compte principal de l'environnement reste accessible.

Les documents personnels exigent simultanément un vendeur affecté correspondant au compte et un prospect source appartenant au compte. Un transfert coordonné de vendeur/prospect n’est pas encore proposé pour ces ventes ; le changement isolé du vendeur d’un brouillon lié est bloqué. Si le prospect est réaffecté par une opération administrative distincte, cette réaffectation retire l'accès du précédent vendeur sans donner automatiquement accès aux anciens documents au nouveau vendeur. Les gestionnaires disposant de droits CRM gardent leur accès administratif habituel.

Les restrictions Never Knock / Ne pas contacter sont vérifiées à nouveau avant une création, émission ou transmission. Un vendeur ne peut pas choisir un identifiant de client, de site ou d'autre vendeur dans les API de ventes personnelles.

## Identité client et traçabilité

Enregistrer approuve la création du client et de son adresse à partir du prospect si nécessaire. La transaction contrôle les correspondances de nom, courriel et téléphone normalisés. Si un client correspondant est détecté, aucun client ni document n'est créé : un gestionnaire doit utiliser la conversion du prospect existante et examiner le rapprochement. Aucune fiche existante n'est écrasée.

Les créations sont idempotentes et la conversion, l'adresse et le document sont enregistrés dans la même transaction. Le prospect converti reste attaché à sa fiche client ; sa version est contrôlée. Un devis accepté ne peut être lié qu'à un contrat par ce parcours. Les versions des documents et les règles de signature, PDF et immutabilité existantes restent applicables.

## Limites

La liste affiche les 100 derniers documents personnels ; la sélection accepte jusqu'à 1 000 prospects. Les devis personnels émis utilisent le portail de devis existant et son impression navigateur ; l'archive PDF signée appartient au contrat de service. Le formulaire de devis personnel propose jusqu'à 24 services ; il ne remplace pas le module administratif complet de devis.

Les liens de devis personnels expirent après sept jours ; la date de validité du devis peut bloquer l'acceptation avant cette échéance. Les brouillons de contrat sont modifiables ; les devis personnels brouillons peuvent être corrigés dans Mes ventes. Le formulaire personnel ne propose pas encore l'annulation ou la révocation d'un devis. Le suivi des contrats signés reste conservé après révocation de leurs liens.

Aucun envoi SMS/courriel, paiement, mandat bancaire, commission, confirmation automatique ou autopilot. Le lien privé doit être partagé uniquement avec le client concerné. Le nom saisi et le consentement ne constituent pas une signature avec certificat qualifié. Le statut Gagné / Made Sale est commercial et ne représente ni un encaissement, ni un service réalisé.

Migrations additives `20261013200000_seller_sales` et `20261013203000_prospecting_cursor_indexes`, sans suppression de données. Les anciennes API CRM et contrats sont conservées. Validation : `tests/seller-sales.test.ts` et `tests/browser-seller-sales.mjs`, PostgreSQL et comptes synthétiques séparés.
