# Suivis commerciaux supervisés

Dans **Mes ventes**, chaque vendeur voit les suivis de ses propres dossiers. Dans **Omega**, un responsable disposant de `omega`, `crm.read`, `leads.read`, `leads.all` et `quotes` dispose de la supervision globale. L'accès personnel nécessite `sales.write` et `leads.read` ; les permissions existantes ne sont pas augmentées automatiquement.

OMEGA propose un suivi pour un rappel de prospect arrivé à échéance, un devis encore valable émis depuis au moins 72 heures, un contrat à signer émis depuis au moins 72 heures, une vente signée à transmettre ou un contrat signé dont les passages restent à préparer. Les restrictions Ne pas contacter et Never Knock bloquent les propositions liées au prospect.

Le bouton **Préparer une proposition** permet de choisir une échéance. La proposition est enregistrée en brouillon. Une personne examine le texte, approuve le suivi, effectue elle-même le traitement puis consigne un compte rendu. Elle peut aussi écarter la proposition. Les heures affichées et saisies suivent Toronto.

Chaque approbation et clôture revérifie les droits, le propriétaire et la version du dossier. Un dossier modifié, réattribué ou restreint peut rendre la proposition obsolète : il faut alors l'écarter et actualiser. Une proposition clôturée n'est pas recréée pour la même version du dossier. Les changements concurrents et doubles enregistrements sont contrôlés côté serveur ; les opérations sont auditées.

Ces actions n'envoient aucun SMS ou courriel, ne passent aucun appel, ne prélèvent aucun paiement et ne transmettent ni ne planifient automatiquement une vente. « Traitement manuel consigné » représente le compte rendu de l'utilisateur, sans preuve de livraison externe. Le worker OMEGA ne déclenche pas ce parcours.

Le tableau charge au plus 100 dossiers par catégorie et 100 propositions, en donnant priorité aux suivis ouverts puis à leurs échéances ; un avertissement indique une liste partielle. Les groupes de pins et les contrats PDF existants sont conservés. Les anciens contrats sans date d'émission connue ne reçoivent pas de rappel de signature fondé sur une date inventée.

La migration additive `20261013210000_sales_followups` ajoute les propositions et la date d'émission des contrats. Elle doit être appliquée avec les migrations habituelles avant de servir le nouveau build. Aucune nouvelle clé API n'est requise.

## Priorités et report d'échéance

Le tableau ouvre la vue **Ouverts**. Les filtres permettent de consulter les échéances dépassées, brouillons à approuver, suivis approuvés et clôturés. La recherche porte sur les noms, motifs et états des suivis chargés, sans distinction de casse ou d'accents. Les compteurs concernent uniquement cette liste bornée, à la date du dernier chargement affichée dans le fuseau Toronto. Actualiser recalcule les retards et restrictions.

Dans **Examiner le suivi**, une personne peut choisir une nouvelle échéance puis **Reporter le suivi**. L'échéance doit être à venir dans les 90 jours. Le serveur conserve l'état brouillon ou approuvé et l'identité de l'approbateur ; le report ne crée aucun rendez-vous, message ou nouvelle proposition. Il ne sauvegarde pas les changements du texte : l'approbation du texte reste distincte. L'ancienne et la nouvelle échéance sont auditées.

Les dossiers modifiés, restreints ou réattribués et les propositions clôturées ne peuvent pas être reportés. Le contrôle de version bloque deux modifications concurrentes. Si l'actualisation détecte qu'une proposition a été modifiée ailleurs, son formulaire d'examen se ferme : rouvrir la version actuelle avant de poursuivre. Les comptes rendus manuels sont visibles dans la liste des suivis clôturés.

Aucune nouvelle migration ou variable d'environnement n'est requise pour ces améliorations.
