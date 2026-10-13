# Transfert des données Rotor vers Proclair

## État vérifié

La cible communiquée est `https://coo-proclair.vercel.app`. Le retour OAuth attendu est `https://coo-proclair.vercel.app/api/integrations/rotor/callback`. Dans Vercel, `PROCLAIR_PUBLIC_ORIGIN` doit être l'origine seule, sans paramètres ni chemin ; redéployer après modification, puis ouvrir **Intégrations → Connecter le compte Rotor Proclair** pour autoriser les lectures nécessaires. Les autorisations Rotor accordées à ChatGPT ne sont pas transférées à cette application.

Cette instance n'a ni connexion Rotor active, ni import réel. L'accès au site Vercel est refusé par le proxy (CONNECT 403), donc la connexion et les données de production ne sont pas vérifiées. Les tests utilisent uniquement des exports synthétiques et une base séparée. Aucun transfert réel de client ou de paiement n'est revendiqué.

## Nouveau centre de transfert

Dans **Intégrations**, le centre de transfert apparaît avant les autres connexions. Trois étapes guident l'import : choisir un export CSV, associer ses colonnes, vérifier l'aperçu puis confirmer. Cette voie fonctionne sans OAuth, à partir des fichiers que l'utilisateur exporte effectivement depuis Rotor. Elle ne présume pas le format d'un export privé non observé.

Le fichier reste dans le navigateur jusqu'à l'analyse. Seules les colonnes sélectionnées sont envoyées au serveur ; le fichier brut, ses colonnes inutilisées et son nom ne sont pas conservés. Les colonnes reconnues comme secrets, numéros de carte ou comptes bancaires ne peuvent pas être associées. Ne sélectionner aucune donnée bancaire sensible ni secret dans une colonne de texte libre.

Limites : CSV UTF-8 (BOM accepté), virgule, point-virgule ou tabulation, champs entre guillemets et retours à la ligne internes, 2 Mo et 1 000 lignes maximum. En-têtes vides ou dupliqués, lignes mal formées et identifiants dupliqués sont refusés. Les données sélectionnées sont limitées à 750 000 octets par requête ; fractionner les gros exports en conservant leurs identifiants. Les imports sont atomiques et reprenables par les mêmes identifiants et empreintes ; aucun fichier partiel n'est présenté comme complet.

## Clients

Associer l'identifiant Rotor et le nom complet ; courriel, téléphone, adresse et notes sont facultatifs. Choisir une colonne contenant le nom complet ou préparer explicitement cette colonne dans l'export si les noms sont séparés. Les identifiants conservent leurs zéros initiaux.

Après confirmation, les clients sont stockés en staging dans un import terminé de type **CSV_EXPORT**, sans création immédiate de client natif. **Comparer et rapprocher** affiche les coordonnées et correspondances existantes. Approuver l'association conserve les champs de la fiche existante ; approuver une nouvelle identité crée le client et, si fournie, son adresse. Une correspondance ambiguë exige une décision ou une justification. L'historique des exports permet de reprendre les revues après fermeture de la page.

Un identifiant existant avec un contenu différent bloque le lot. L'import n'écrase pas le miroir OAuth ni une fiche native existante. Les mises à jour de sources déjà liées nécessitent une réconciliation séparée.

## Factures et paiements historiques

Associer identifiant, montant, devise, état dans Rotor et date de source. Les références client et facture, méthode et référence sont facultatives mais nécessaires pour conserver les liens qui figurent dans l'export. Choisir explicitement dollars ou cents. Les montants sont convertis sans calcul flottant et conservent leur signe ; aucune interprétation automatique d'un remboursement ou de l'état d'encaissement n'est faite. CAD uniquement, sans conversion de devise. La somme affichée concerne le fichier et ne représente pas un solde comptable.

Les dates doivent être ISO avec fuseau ; une date YYYY-MM-DD est enregistrée à minuit Toronto, ce qui ne reconstitue pas une heure absente de l'export. Les états source sont affichés tels quels. Les factures et paiements ont des espaces d'identifiants distincts.

Après confirmation, les références sont consultables dans **Factures → Factures historiques Rotor** ou **Paiements → Paiements historiques Rotor**, par pages de 50 avec compteur total. Les liens vers les clients natifs utilisent les correspondances approuvées. Un identifiant client non rapproché reste conservé et affiché. Les données font partie de l'export métier natif et de la sauvegarde PostgreSQL.

L'archive ne crée ni facture ni paiement dans le registre comptable Proclair ; elle ne règle aucune facture, ne prélève aucune carte, ne relance aucun client et ne déclenche aucune commission. Les remboursements, litiges, soldes de départ et rapprochements du registre exigent une migration comptable séparée fondée sur les pièces réelles. Un contenu financier modifié pour un identifiant connu est bloqué, sans remplacement silencieux.

## Permissions et déploiement

L'import client exige `integrations` et `crm.write`. L'import financier exige `integrations` et `finance`. Consulter l'archive exige `finance`. L'historique d'exports masque les lots financiers aux comptes sans `finance`. Aucun droit supplémentaire n'est accordé aux vendeurs.

Migrations additives : `20261014010000_rotor_file_import` et `20261014011000_rotor_annual_import`. Générer Prisma et appliquer les migrations avant de servir le build. Aucune clé Stripe ou Twilio n'est requise pour cette archive. L'origine publique a été proposée dans le brouillon de configuration cloud ; enregistrer/publier ce brouillon ne remplace pas la configuration du projet Vercel.

## Périmètre restant

Les adaptateurs OAuth existants lisent clients, jobs et visites en staging ; les pins conservent leur parcours distinct. Cette livraison n'importe pas automatiquement tous les objets Rotor : contrats, lignes de factures, documents, communications, consentements, équipes, commissions, historique d'audit et opérations comptables nécessitent leurs exports ou schémas vérifiés et des rapprochements adaptés. Un client rapproché ne certifie pas le transfert complet de son dossier.


## Import annuel en lecture OAuth

La période des imports reprenables peut atteindre 366 jours. La validation du service, du lecteur MCP et la contrainte PostgreSQL utilisent la même limite ; la migration annuelle conserve tous les imports existants. La période sélectionnée est transmise pour les visites ; clients et jobs restent paginés indépendamment de cette période. Les schémas annoncés par Rotor restent vérifiés et peuvent imposer des restrictions supplémentaires. Cette capacité ne prouve pas qu'une année de données réelle a été transférée.

## Contrôle de la migration et dossier client

Le centre de transfert affiche les compteurs de tous les clients présents dans le miroir : identifiants en staging, correspondances approuvées, clients restant à rapprocher et sources modifiées depuis la dernière correspondance. Ces compteurs proviennent d'une lecture PostgreSQL cohérente, sans limitation aux vingt derniers exports ou à une page d'échantillon. Le rapprochement d'un client depuis le centre actualise le tableau ; un bouton permet aussi une actualisation manuelle.

Avec le droit Finances, un contrôle séparé compte les factures et paiements archivés, les références client sans correspondance native, les identifiants client manquants et les paiements dont la facture source n'est pas présente dans l'archive. Sans Finances, aucune de ces statistiques financières n'est renvoyée. Les correspondances directes d'anciens clients natifs portant l'identifiant Rotor sont également reconnues dans ce contrôle financier.

Dans une fiche client, l'onglet **Historique Rotor** affiche ses factures et paiements archivés, par les identifiants Rotor directement attachés à la fiche ou les correspondances approuvées. Cet onglet exige le droit Finances et conserve la pagination de cinquante références. Les rubriques du dossier sont désormais libellées en français. Les montants demeurent historiques et ne changent pas le registre comptable.

Le rapport précise sa date de calcul à Toronto. Un lot terminé ou tous les clients rapprochés ne certifient pas que tous les objets et toutes les périodes de Rotor ont été transférés. Aucune nouvelle migration ou clé n'est nécessaire pour ce contrôle.

## Recherche dans la revue des clients

La revue d'un import dispose d'une recherche serveur sur le nom, courriel, téléphone, adresse et identifiant Rotor. La recherche ne dépend pas des vingt fiches affichées : le compteur indique tous les résultats de cet import avant pagination. La casse est ignorée ; les caractères `%`, `_` et barre oblique inverse sont traités littéralement, sans recherche approximative d'accents ou normalisation automatique des numéros.

Choisir **Tous les clients**, **À rapprocher**, **Déjà rapproché** ou **Source à revérifier**, puis **Appliquer les filtres clients**. La pagination garde ces critères. Après approbation, la liste est rechargée : une fiche rapprochée disparaît de la vue À rapprocher. Les réponses d'une ancienne recherche ou d'un ancien import sont ignorées.

Un changement de hash dans le miroir ou de la correspondance rend la fiche à revérifier et bloque son bouton de promotion. Utiliser l'import de source actuel et la revue adaptée ; aucun écrasement automatique. Les informations de la fiche native associée sont affichées uniquement avec le droit de lecture CRM. La consultation du staging exige toujours Intégrations et la promotion conserve ses contrôles de modification CRM et d'approbation.

Aucune nouvelle migration ni variable d'environnement nécessaire.
