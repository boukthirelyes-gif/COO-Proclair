# Proclair OS — identité bleu eau

Source du logo : image officielle fournie par le propriétaire de Proclair le 16 octobre 2026. Image recadrée et optimisée en WebP **450 × 70 pixels**, sans redessiner la typographie. Le SHA du blob binaire a été vérifié. Utiliser la ressource `/proclair-wordmark.webp` et le composant réutilisable `ProclairLogo`.

L'interface reste sombre (choix précédent de l'équipe), mais utilise un bleu nuit de structure et un bleu eau pour les actions. Les statuts de prospection gardent leur sémantique d'origine : vendu vert, absent jaune, refus rouge, etc.

Placements : connexion, barre latérale, en-tête et accueil/dashboard; favicon géométrique assorti. Les PDFs et les pièces financières ne sont pas modifiés afin de ne pas altérer des sorties légales sans test de rendu.

Le thème est isolé dans `src/app/proclair-blue.css`, chargé après `dark-theme.css` et `command-center.css`. Il ne s'applique qu'à l'écran afin de laisser les impressions en clair. Aucun changement de base de données, de permission, de flux Stripe/Twilio ou de données.

Tests : la suite navigateur V30 vérifie la présence des vraies images, et l'identité du nouveau token `--pc-orange` conservé pour compatibilité avec les sélecteurs CSS historiques mais recoloré en bleu.
