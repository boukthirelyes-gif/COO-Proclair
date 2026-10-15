# Tableau clients natif — 14 octobre 2026

Le tableau générique à quatre colonnes est remplacé par une liste dense inspirée
de la capture Clients. Courriel et téléphone sont affichés ensemble en colonnes
séparées. Chaque ligne présente les adresses/sites natifs, le nombre de contrats
actifs, l’équipe affectée aux visites confirmées/planifiées/en cours et l’origine.
Les champs ne représentent ni revenus ni commissions. Aucune affectation vendeur,
ville ou valeur SV/LV n’est inventée : le modèle existant ne les définit pas.

Tri de sept colonnes, filtre contrats/origine, recherche par coordonnées, adresses,
équipe et notes, pagination 10/25/50, premier nom fixe sur mobile. Après une création
native, la liste est filtrée sur le nom enregistré. Les fiches existantes, retours
URL et actions de modification sont conservés ; l’édition et la création sont
réservées aux comptes possédant crm.write. Aucun endpoint ni migration ajouté.

Validation : compilation de production et TypeScript réussis ; six contrôles du
tableau avec lectures synthétiques interceptées et sans persistance ; 27 étapes
CRM/planning/fiches/audit/mobile et 25 contrôles du cœur natif réussis sur la
base navigateur dédiée, sans erreur JavaScript. Captures
synthétiques locales, aucun fichier client ajouté au Git. Les nouvelles assertions
sont dans la CI. Les tests de formulaire ciblent explicitement le dialogue, pour
ne pas confondre son champ Courriel et le bouton de tri Courriel du nouveau tableau.
La suite métier de 135 tests, validée au lot précédent, n’est pas présentée comme
rejouée pour cette modification d’interface.

La livraison est destinée à main. Vérifier les assets effectivement servis par
coo-proclair.vercel.app après le push ; un push ne prouve pas à lui seul Vercel Ready.
