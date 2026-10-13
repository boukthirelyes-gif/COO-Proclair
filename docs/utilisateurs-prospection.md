# Utilisateurs et prospection native

Ces modules utilisent la base PostgreSQL Proclair. Rotor n’est pas nécessaire.

## Créer et restreindre un compte

Connectez-vous comme `admin`, puis ouvrez **Utilisateurs → Ajouter un utilisateur**. Choisissez un identifiant unique, un nom, un mot de passe d’au moins 12 caractères et un rôle. Transmettez les identifiants directement au membre de votre équipe ; l’application n’envoie aucun courriel.

| Rôle | Accès initial |
| --- | --- |
| Administrateur | Tous les modules et comptes |
| Gestionnaire | CRM, planning, devis, finances, propositions OMEGA, toutes les portes |
| Planificateur | Consultation du CRM, interventions, propositions OMEGA et portes affectées |
| Vendeur | Consultation et modification de ses portes affectées |
| Lecture seule | Consultation du CRM et de ses portes affectées |

Décochez les autorisations d’un rôle pour réduire ses accès. Aucun compte ne peut recevoir une permission extérieure à son rôle. La gestion nécessite la consultation du CRM ; la modification de portes nécessite la consultation de la carte. Un administrateur conserve tous les droits. Seul un administrateur peut activer/arrêter le moteur OMEGA, reprendre une préparation en erreur ou effectuer les opérations financières déjà réservées à l’administrateur.

Les restrictions sont vérifiées côté serveur pour chaque route, même si quelqu’un appelle directement l’API. La consultation du CRM inclut ses prix commerciaux ; l’autorisation « Facturation et paiements » contrôle séparément les factures, dépenses et mouvements de paiement. Sans consultation du CRM, `/api/state` ne renvoie aucune donnée client, planning ou journal. Les vendeurs n’accèdent pas aux modules financiers, aux intégrations, aux paramètres ou à l’export global.

**Modifier les accès** permet de changer le rôle, les autorisations et le mot de passe, ou de désactiver un compte. Toute modification invalide ses sessions précédentes, même après réactivation. Les mots de passe sont hachés avec scrypt et un sel aléatoire propre à chaque compte ; les API, journaux d’audit et exports ne contiennent pas ces hachages. Un administrateur ne peut pas retirer son propre accès administrateur.

Le compte principal `admin` demeure géré par `PROCLAIR_ADMIN_PASSWORD` dans les variables d’environnement et ne peut être désactivé dans cette interface. Les sessions durent huit heures. Les tentatives de connexion sont limitées par identifiant et par minute dans PostgreSQL, sur toutes les instances Vercel. Les techniciens sont des ressources de planning distinctes des comptes de connexion.

## Carte porte-à-porte

Ouvrez **Carte de prospection**, puis **Ajouter une porte**. Saisissez l’adresse et ses coordonnées, ou cliquez sur le fond de carte pour choisir l’emplacement. Affectez la porte à un compte actif autorisé à consulter la carte. Un vendeur créant une porte se l’affecte automatiquement ; seuls les comptes autorisés à gérer toutes les portes peuvent réaffecter des pins ou consulter les portes non affectées.

Les statuts disponibles sont : non visitée, absent, pas intéressé, rappel, suivi, en cours, vendu, annulé et ne pas contacter. Chaque pin conserve ses notes, son vendeur, sa date de rappel et son historique. Les rappels sont saisis et affichés en heure de Toronto, puis stockés en UTC. Un statut « Rappel » exige une date. « Ne pas contacter » interdit tout rappel ; seul un administrateur peut lever ce statut avec une note justificative. Une modification concurrente de la même porte est rejetée plutôt que d’écraser le travail d’un autre utilisateur.

La liste permet de rechercher par adresse/notes et de filtrer par état ou vendeur. Les marqueurs reprennent les couleurs de la légende. Le fond provient des tuiles OpenStreetMap, avec attribution visible ; les requêtes de tuiles sont envoyées directement par le navigateur au fournisseur. Aucune clé API de carte ni connexion Rotor n’est nécessaire. Si les tuiles sont indisponibles, la liste reste utilisable. Le bouton « Centrer sur ma position » demande la localisation au navigateur uniquement lorsque vous cliquez dessus ; cette position n’est pas enregistrée automatiquement. Aucun géocodage automatique, itinéraire routier, suivi GPS permanent ou découpage en polygones de territoire n’est ajouté dans cette version. La carte charge au maximum 2 000 portes accessibles et signale explicitement un volume supérieur.

Les pins et les métadonnées publiques des comptes sont inclus dans l’export métier privé. Cet export ne restaure pas les identifiants de connexion ; utilisez une sauvegarde PostgreSQL privée pour une restauration complète.

## Production

La migration additive `20261013010000_users_prospecting` crée les tables sans réinitialiser les données existantes. Le build Vercel de production exécute les migrations avec la configuration existante. Aucune variable d’environnement supplémentaire n’est nécessaire pour ces modules.

## Catégories Proclair — livraison 0.2.0

Les nouvelles portes choisissent parmi **No Home #808080**, **Not interested #FF0000**, **Interested #fbbb09**, **Made Sale #00FF00** et **Never Knock #000000**, avec les UUID fournis dans la directive Proclair. Le statut de suivi local (rappel, en cours, etc.) reste séparé de la catégorie ; aucune ancienne porte ni aucun audit n’est supprimé. Les catégories sont initialement identifiées comme référence utilisateur, puis peuvent être vérifiées par une lecture Rotor autorisée.

La fiche s’ouvre dans un panneau latéral avec fermeture par Échap. Les filtres de date utilisent le jour de Toronto ; les compteurs sont des nombres de pins, pas des revenus ni des commissions. Le calque Rotor est en lecture seule, réservé aux administrateurs, avec un filtre distinct de membre externe. Un lien client n’est affiché que sur correspondance d’identifiant Rotor connue, sans rapprochement automatique par adresse ou nom. Les détails de clients déjà présents dans le miroir peuvent être identifiés par leur référence externe sans créer de client natif.

## Prospects et pipeline natifs — 2026-10-13

Depuis **Prospects**, créez une fiche ou ouvrez une porte puis choisissez « Créer un prospect depuis cette porte ». Saisissez le nom et les coordonnées réelles, la source, les tags, le potentiel en centimes CAD et une relance à l’heure de Toronto. Le pipeline livré comporte cinq étapes fixes ; le changement d’étape utilise une sélection. Une valeur potentielle ne représente pas un revenu encaissé et une étape « Gagné » ne crée pas un paiement.

Les nouveaux vendeurs reçoivent `leads.read` et `leads.write`, et voient uniquement les prospects qui leur sont affectés. `leads.all` permet au gestionnaire de consulter et affecter toute l’équipe. La conversion exige également `crm.write` et `leads.write`. Les comptes non administrateurs déjà existants gardent leurs permissions explicites : ajoutez les nouveaux droits depuis Utilisateurs selon leur rôle. Les restrictions sont vérifiées côté serveur à chaque requête.

La conversion propose les clients correspondant au nom, courriel ou téléphone normalisé. Choisissez explicitement une fiche existante ; une nouvelle fiche malgré une correspondance exige une justification. Une conversion rejouée reste unique. Les données du client existant ne sont pas remplacées. Le prospect converti devient consultable uniquement ; les modifications suivantes appartiennent à la fiche client. Never Knock et « Ne pas contacter » bloquent les relances et la conversion.

Relances enregistrées et audit interne sont disponibles ; aucun appel, courriel, SMS, contrat, rendez-vous, facture ou paiement ne découle automatiquement de cette conversion. Les pipelines personnalisés, séquences de messages, commissions et prévisions avancées restent à développer.
