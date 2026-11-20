/* Bibliothèque d'exercices de Tempo.
   Chaque ligne : [nom, muscle principal, matériel, type, répétitions conseillées, conseil d'exécution, muscles secondaires]
   Type : « Poly » = polyarticulaire (plusieurs articulations, charges lourdes), « Iso » = isolation (un muscle ciblé). */
(function () {
  "use strict";
  const L = [
    /* ---------- Pecs ---------- */
    ["Développé couché", "Pecs", "Barre", "Poly", "5-8", "Omoplates serrées, pieds ancrés, barre au bas des pecs.", "Triceps, Épaules"],
    ["Développé couché haltères", "Pecs", "Haltères", "Poly", "8-10", "Descendez lentement, haltères au niveau de la poitrine.", "Triceps, Épaules"],
    ["Développé incliné barre", "Pecs", "Barre", "Poly", "6-10", "Banc à 30°, la barre touche le haut des pecs.", "Épaules, Triceps"],
    ["Développé incliné haltères", "Pecs", "Haltères", "Poly", "8-10", "Banc à 30°, coudes à 45° du buste.", "Épaules, Triceps"],
    ["Développé décliné", "Pecs", "Barre", "Poly", "6-10", "Cible le bas des pecs, descendez sous les pectoraux.", "Triceps"],
    ["Développé couché prise serrée", "Pecs", "Barre", "Poly", "6-10", "Mains largeur d'épaules, coudes près du corps.", "Triceps"],
    ["Développé couché Smith", "Pecs", "Smith", "Poly", "8-12", "Trajectoire guidée : idéal pour finir sans pareur.", "Triceps, Épaules"],
    ["Développé machine convergente", "Pecs", "Machine", "Poly", "8-12", "Poussez en rapprochant les mains, contrôlez le retour.", "Triceps"],
    ["Développé sol haltères", "Pecs", "Haltères", "Poly", "8-12", "Les coudes touchent le sol : ménage les épaules.", "Triceps"],
    ["Écarté couché haltères", "Pecs", "Haltères", "Iso", "10-15", "Bras légèrement fléchis, ouvrez jusqu'à l'étirement.", ""],
    ["Écarté incliné haltères", "Pecs", "Haltères", "Iso", "10-15", "Banc à 30°, mouvement en arc de cercle.", "Épaules"],
    ["Écarté poulie", "Pecs", "Poulie", "Iso", "12-15", "Poulies hautes, croisez les mains devant le bas des pecs.", ""],
    ["Écarté poulie basse", "Pecs", "Poulie", "Iso", "12-15", "Poulies basses, remontez vers le haut des pecs.", "Épaules"],
    ["Pec deck", "Pecs", "Machine", "Iso", "12-15", "Coudes à hauteur d'épaules, serrez 1 s en fin de mouvement.", ""],
    ["Pompes", "Pecs", "Poids du corps", "Poly", "10-25", "Corps gainé en planche, poitrine au ras du sol.", "Triceps, Abdos"],
    ["Pompes lestées", "Pecs", "Lest", "Poly", "8-15", "Disque sur le dos ou gilet lesté.", "Triceps, Abdos"],
    ["Pompes déclinées", "Pecs", "Poids du corps", "Poly", "10-20", "Pieds surélevés : travaille le haut des pecs.", "Épaules, Triceps"],
    ["Pompes diamant", "Pecs", "Poids du corps", "Poly", "8-15", "Mains en losange sous le sternum.", "Triceps"],
    ["Dips buste penché", "Pecs", "Poids du corps", "Poly", "8-12", "Penchez le buste vers l'avant, coudes écartés.", "Triceps, Épaules"],
    ["Pull-over haltère", "Pecs", "Haltères", "Iso", "10-12", "Allongé en travers du banc, bras presque tendus.", "Dos"],
    ["Svend press", "Pecs", "Disque", "Iso", "12-15", "Serrez un disque entre les paumes et poussez devant vous.", "Épaules"],

    /* ---------- Dos ---------- */
    ["Tractions", "Dos", "Poids du corps", "Poly", "6-10", "Partez bras tendus, menton au-dessus de la barre.", "Biceps, Avant-bras"],
    ["Tractions lestées", "Dos", "Lest", "Poly", "4-8", "Ceinture de lest, même amplitude complète.", "Biceps"],
    ["Tractions supination", "Dos", "Poids du corps", "Poly", "6-10", "Paumes vers vous : plus de biceps.", "Biceps"],
    ["Tractions prise neutre", "Dos", "Poids du corps", "Poly", "6-10", "Paumes face à face, plus doux pour les épaules.", "Biceps"],
    ["Tractions assistées", "Dos", "Machine", "Poly", "8-12", "Contrepoids ou élastique pour apprendre le mouvement.", "Biceps"],
    ["Tirage vertical", "Dos", "Poulie", "Poly", "10-12", "Tirez vers le haut de la poitrine, buste légèrement incliné.", "Biceps"],
    ["Tirage vertical prise serrée", "Dos", "Poulie", "Poly", "10-12", "Poignée en V, coudes le long du corps.", "Biceps"],
    ["Tirage bras tendus", "Dos", "Poulie", "Iso", "12-15", "Bras quasi tendus, ramenez la barre vers les cuisses.", ""],
    ["Tirage horizontal", "Dos", "Poulie", "Poly", "10-12", "Dos droit, tirez vers le nombril, omoplates serrées.", "Biceps, Trapèzes"],
    ["Rowing barre", "Dos", "Barre", "Poly", "6-10", "Buste penché à 45°, barre vers le nombril.", "Biceps, Lombaires"],
    ["Rowing Pendlay", "Dos", "Barre", "Poly", "5-8", "Barre reposée au sol à chaque répétition, tirage explosif.", "Lombaires"],
    ["Rowing haltère un bras", "Dos", "Haltères", "Poly", "8-12", "Genou sur le banc, tirez le coude vers la hanche.", "Biceps"],
    ["Rowing T-bar", "Dos", "Barre", "Poly", "8-10", "Poitrine haute, tirez la barre vers le sternum.", "Biceps, Trapèzes"],
    ["Rowing poitrine appuyée", "Dos", "Haltères", "Poly", "10-12", "Allongé sur banc incliné : zéro triche, dos protégé.", "Trapèzes"],
    ["Rowing machine", "Dos", "Machine", "Poly", "10-12", "Poitrine contre l'appui, serrez les omoplates.", "Biceps"],
    ["Rowing inversé", "Dos", "Poids du corps", "Poly", "8-15", "Sous une barre basse ou des anneaux, corps gainé.", "Biceps, Abdos"],
    ["Rowing Meadows", "Dos", "Barre", "Poly", "8-12", "Une extrémité de barre, tirage unilatéral de côté.", "Biceps"],
    ["Seal row", "Dos", "Barre", "Poly", "8-12", "Allongé sur un banc haut, la barre monte jusqu'au banc.", "Trapèzes"],
    ["Pull-over poulie", "Dos", "Poulie", "Iso", "12-15", "Corde ou barre, bras tendus jusqu'aux hanches.", ""],
    ["Soulevé de terre", "Dos", "Barre", "Poly", "3-6", "Dos neutre, poussez le sol avec les jambes, barre contre les tibias.", "Ischios, Fessiers, Lombaires"],
    ["Rack pull", "Dos", "Barre", "Poly", "4-8", "Soulevé partiel depuis les genoux : renforce le haut du dos.", "Trapèzes, Lombaires"],

    /* ---------- Trapèzes ---------- */
    ["Shrugs barre", "Trapèzes", "Barre", "Iso", "10-15", "Montez les épaules vers les oreilles, sans rouler.", "Avant-bras"],
    ["Shrugs haltères", "Trapèzes", "Haltères", "Iso", "10-15", "Pause d'une seconde en haut.", "Avant-bras"],
    ["Shrugs trap bar", "Trapèzes", "Trap bar", "Iso", "10-15", "Prise neutre, très lourd possible.", ""],
    ["Tirage menton", "Trapèzes", "Barre", "Poly", "10-12", "Prise large, coudes jusqu'à hauteur d'épaules, pas plus.", "Épaules"],
    ["Farmer walk", "Trapèzes", "Haltères", "Poly", "30-60 m", "Marchez droit avec des charges lourdes.", "Avant-bras, Abdos"],
    ["Y-raise incliné", "Trapèzes", "Haltères", "Iso", "12-15", "Allongé sur banc incliné, bras en Y : bas des trapèzes.", "Épaules"],

    /* ---------- Lombaires ---------- */
    ["Extension lombaire", "Lombaires", "Banc", "Iso", "12-15", "Sur banc à 45°, remontez dans l'alignement, sans hyperextension.", "Fessiers, Ischios"],
    ["Good morning", "Lombaires", "Barre", "Poly", "8-10", "Barre sur le dos, basculez le buste, dos neutre.", "Ischios"],
    ["Superman", "Lombaires", "Poids du corps", "Iso", "15-20", "À plat ventre, décollez bras et jambes.", "Fessiers"],
    ["Bird dog", "Lombaires", "Poids du corps", "Iso", "10/côté", "À quatre pattes, bras et jambe opposés tendus.", "Abdos"],

    /* ---------- Épaules ---------- */
    ["Développé militaire", "Épaules", "Barre", "Poly", "5-8", "Debout, fessiers serrés, la tête passe sous la barre.", "Triceps"],
    ["Développé haltères assis", "Épaules", "Haltères", "Poly", "8-10", "Dossier droit, descendez à hauteur d'oreilles.", "Triceps"],
    ["Développé Arnold", "Épaules", "Haltères", "Poly", "8-12", "Rotation des paumes pendant la montée.", "Triceps"],
    ["Développé machine épaules", "Épaules", "Machine", "Poly", "10-12", "Dos plaqué, poussez sans verrouiller.", "Triceps"],
    ["Push press", "Épaules", "Barre", "Poly", "3-6", "Petite impulsion des jambes pour lancer la barre.", "Triceps, Quadriceps"],
    ["Landmine press", "Épaules", "Barre", "Poly", "8-12", "Une extrémité de barre, poussée en diagonale.", "Pecs, Triceps"],
    ["Élévations latérales", "Épaules", "Haltères", "Iso", "12-15", "Coudes légèrement fléchis, montez jusqu'à l'horizontale.", ""],
    ["Élévations latérales poulie", "Épaules", "Poulie", "Iso", "12-15", "Tension constante, poulie basse côté opposé.", ""],
    ["Élévations latérales machine", "Épaules", "Machine", "Iso", "12-15", "Coudes contre les coussins, montée contrôlée.", ""],
    ["Élévations frontales", "Épaules", "Haltères", "Iso", "10-12", "Montez devant vous jusqu'aux yeux.", ""],
    ["Oiseau", "Épaules", "Haltères", "Iso", "12-15", "Buste penché, ouvrez les bras : arrière d'épaules.", "Trapèzes"],
    ["Reverse pec deck", "Épaules", "Machine", "Iso", "12-15", "Face à la machine, ouvrez les bras en arrière.", "Trapèzes"],
    ["Face pull", "Épaules", "Poulie", "Iso", "12-15", "Corde vers le visage, coudes hauts, rotation externe.", "Trapèzes"],
    ["Rotation externe poulie", "Épaules", "Poulie", "Iso", "15-20", "Coude collé au corps : coiffe des rotateurs.", ""],
    ["Pompes piquées", "Épaules", "Poids du corps", "Poly", "8-12", "Hanches hautes en V inversé, tête vers le sol.", "Triceps"],
    ["Pompes en équilibre", "Épaules", "Poids du corps", "Poly", "3-8", "Contre un mur, tête vers le sol.", "Triceps"],

    /* ---------- Biceps ---------- */
    ["Curl barre", "Biceps", "Barre", "Iso", "8-10", "Coudes fixes, sans balancer le buste.", "Avant-bras"],
    ["Curl barre EZ", "Biceps", "Barre EZ", "Iso", "8-12", "Prise semi-supination, plus douce pour les poignets.", "Avant-bras"],
    ["Curl haltères", "Biceps", "Haltères", "Iso", "8-12", "Tournez le poignet (supination) en montant.", "Avant-bras"],
    ["Curl marteau", "Biceps", "Haltères", "Iso", "10-12", "Prise neutre : brachial et avant-bras.", "Avant-bras"],
    ["Curl incliné", "Biceps", "Haltères", "Iso", "10-12", "Banc à 45°, bras derrière le buste : étirement maximal.", ""],
    ["Curl pupitre", "Biceps", "Barre EZ", "Iso", "10-12", "Bras sur le pupitre, descendez presque tendu.", ""],
    ["Curl concentré", "Biceps", "Haltères", "Iso", "10-12", "Coude contre la cuisse, montée lente.", ""],
    ["Curl poulie", "Biceps", "Poulie", "Iso", "12-15", "Tension constante, idéal en fin de séance.", ""],
    ["Curl araignée", "Biceps", "Haltères", "Iso", "10-12", "Poitrine sur banc incliné, bras pendants.", ""],
    ["Curl Bayesian", "Biceps", "Poulie", "Iso", "10-12", "Dos à la poulie, bras en arrière : très étiré.", ""],
    ["Curl machine", "Biceps", "Machine", "Iso", "10-15", "Guidé, parfait pour finir à l'échec.", ""],

    /* ---------- Triceps ---------- */
    ["Dips", "Triceps", "Poids du corps", "Poly", "8-12", "Buste droit, descendez coudes à 90°.", "Pecs, Épaules"],
    ["Dips lestés", "Triceps", "Lest", "Poly", "5-10", "Ceinture de lest, amplitude contrôlée.", "Pecs"],
    ["Dips sur banc", "Triceps", "Poids du corps", "Iso", "10-20", "Mains sur un banc derrière vous.", ""],
    ["Barre au front", "Triceps", "Barre EZ", "Iso", "8-10", "Barre vers le front, seuls les avant-bras bougent.", ""],
    ["Extension triceps poulie", "Triceps", "Poulie", "Iso", "10-12", "Coudes collés au corps, tendez complètement.", ""],
    ["Extension triceps corde", "Triceps", "Poulie", "Iso", "12-15", "Écartez la corde en bas du mouvement.", ""],
    ["Extension nuque haltère", "Triceps", "Haltères", "Iso", "10-12", "Haltère derrière la tête, coudes pointés vers le haut.", ""],
    ["Extension nuque poulie", "Triceps", "Poulie", "Iso", "10-15", "Dos à la poulie : chef long très étiré.", ""],
    ["Kickback", "Triceps", "Haltères", "Iso", "12-15", "Buste penché, tendez le bras vers l'arrière.", ""],
    ["Extension unilatérale poulie", "Triceps", "Poulie", "Iso", "12-15", "Un bras, poignée simple, tendez complètement.", ""],
    ["JM press", "Triceps", "Barre", "Poly", "6-10", "Hybride développé serré / barre au front.", "Pecs"],

    /* ---------- Avant-bras ---------- */
    ["Curl poignets", "Avant-bras", "Barre", "Iso", "15-20", "Avant-bras sur les cuisses, enroulez les poignets.", ""],
    ["Curl poignets inversé", "Avant-bras", "Barre", "Iso", "15-20", "Paumes vers le bas : extenseurs.", ""],
    ["Curl inversé", "Avant-bras", "Barre EZ", "Iso", "10-12", "Prise pronation, coudes fixes.", "Biceps"],
    ["Suspension barre", "Avant-bras", "Poids du corps", "Iso", "30-60 s", "Restez suspendu bras tendus : la poigne.", "Dos"],
    ["Pince disques", "Avant-bras", "Disque", "Iso", "20-40 s", "Tenez deux disques lisses entre les doigts.", ""],

    /* ---------- Abdos ---------- */
    ["Crunch", "Abdos", "Poids du corps", "Iso", "15-25", "Enroulez le buste, bas du dos au sol.", ""],
    ["Crunch poulie", "Abdos", "Poulie", "Iso", "12-15", "À genoux, enroulez vers le bas avec la corde.", ""],
    ["Crunch machine", "Abdos", "Machine", "Iso", "12-15", "Charge réglable, expirez en enroulant.", ""],
    ["Relevé de jambes suspendu", "Abdos", "Poids du corps", "Iso", "8-15", "Suspendu, montez les genoux puis les pieds.", "Avant-bras"],
    ["Relevé de genoux chaise romaine", "Abdos", "Poids du corps", "Iso", "10-15", "Dos contre l'appui, enroulez le bassin.", ""],
    ["Relevé de jambes au sol", "Abdos", "Poids du corps", "Iso", "12-20", "Mains sous les fesses, bas du dos plaqué.", ""],
    ["Gainage", "Abdos", "Poids du corps", "Iso", "30-60 s", "Sur les avant-bras, corps aligné, fessiers serrés.", "Épaules"],
    ["Gainage latéral", "Abdos", "Poids du corps", "Iso", "30-45 s", "Sur un coude, bassin haut : obliques.", "Fessiers"],
    ["Roue abdominale", "Abdos", "Roue", "Poly", "6-12", "Déroulez sans creuser le dos.", "Épaules, Dos"],
    ["Russian twist", "Abdos", "Disque", "Iso", "20-30", "Assis, pieds décollés, rotation du buste.", ""],
    ["Pallof press", "Abdos", "Poulie", "Iso", "10/côté", "Résistez à la rotation, bras tendus devant.", ""],
    ["Bûcheron poulie", "Abdos", "Poulie", "Poly", "10-12/côté", "Diagonale du haut vers le bas, hanches fixes.", "Épaules"],
    ["Dead bug", "Abdos", "Poids du corps", "Iso", "10/côté", "Sur le dos, bras et jambe opposés s'allongent.", ""],
    ["Hollow hold", "Abdos", "Poids du corps", "Iso", "20-40 s", "Position banane, bas du dos collé au sol.", ""],
    ["Mountain climbers", "Abdos", "Poids du corps", "Poly", "30-45 s", "En planche, genoux vers la poitrine en rythme.", "Corps entier"],
    ["Dragon flag", "Abdos", "Poids du corps", "Iso", "4-8", "Corps gainé en planche, descente très lente.", ""],

    /* ---------- Quadriceps ---------- */
    ["Squat", "Quadriceps", "Barre", "Poly", "5-8", "Pieds largeur d'épaules, cuisses au moins parallèles.", "Fessiers, Lombaires"],
    ["Squat avant", "Quadriceps", "Barre", "Poly", "5-8", "Barre sur l'avant des épaules, buste très droit.", "Abdos, Fessiers"],
    ["Squat Smith", "Quadriceps", "Smith", "Poly", "8-12", "Pieds un peu en avant, trajectoire guidée.", "Fessiers"],
    ["Squat gobelet", "Quadriceps", "Haltères", "Poly", "10-15", "Haltère contre la poitrine, coudes entre les genoux.", "Fessiers, Abdos"],
    ["Hack squat", "Quadriceps", "Machine", "Poly", "8-12", "Dos plaqué, descente profonde.", "Fessiers"],
    ["Pendulum squat", "Quadriceps", "Machine", "Poly", "8-12", "Trajectoire en arc : quadriceps très sollicités.", "Fessiers"],
    ["Presse à cuisses", "Quadriceps", "Machine", "Poly", "10-12", "Pieds au milieu du plateau, ne verrouillez pas les genoux.", "Fessiers"],
    ["Leg extension", "Quadriceps", "Machine", "Iso", "12-15", "Pause d'une seconde jambes tendues.", ""],
    ["Fentes marchées", "Quadriceps", "Haltères", "Poly", "10-12/jambe", "Grand pas, genou arrière frôle le sol.", "Fessiers, Ischios"],
    ["Fentes arrière", "Quadriceps", "Haltères", "Poly", "8-12/jambe", "Reculez la jambe : plus doux pour les genoux.", "Fessiers"],
    ["Fentes bulgares", "Quadriceps", "Haltères", "Poly", "8-12/jambe", "Pied arrière sur un banc, buste droit.", "Fessiers"],
    ["Step-up", "Quadriceps", "Haltères", "Poly", "10/jambe", "Montez sur un banc en poussant sur la jambe avant.", "Fessiers"],
    ["Sissy squat", "Quadriceps", "Poids du corps", "Iso", "10-15", "Penchez-vous en arrière en avançant les genoux.", ""],
    ["Squat sauté", "Quadriceps", "Poids du corps", "Poly", "10-15", "Réception souple, enchaînez sans pause.", "Fessiers, Mollets"],
    ["Chaise", "Quadriceps", "Poids du corps", "Iso", "30-60 s", "Dos au mur, cuisses à l'horizontale.", ""],
    ["Squat pistol", "Quadriceps", "Poids du corps", "Poly", "3-8/jambe", "Sur une jambe, l'autre tendue devant.", "Fessiers, Abdos"],

    /* ---------- Ischios ---------- */
    ["Soulevé de terre roumain", "Ischios", "Barre", "Poly", "8-10", "Genoux souples, barre qui glisse le long des cuisses.", "Fessiers, Lombaires"],
    ["Soulevé de terre jambes tendues", "Ischios", "Barre", "Poly", "8-10", "Jambes presque tendues, étirement maximal.", "Lombaires"],
    ["Soulevé de terre roumain haltères", "Ischios", "Haltères", "Poly", "8-12", "Haltères devant les cuisses, hanches en arrière.", "Fessiers"],
    ["Soulevé de terre une jambe", "Ischios", "Haltères", "Poly", "8-10/jambe", "Basculez sur une jambe, bassin de niveau.", "Fessiers, Abdos"],
    ["Leg curl", "Ischios", "Machine", "Iso", "10-12", "Contrôlez la descente, hanches plaquées.", "Mollets"],
    ["Leg curl assis", "Ischios", "Machine", "Iso", "10-12", "Position assise : ischios plus étirés.", ""],
    ["Leg curl allongé", "Ischios", "Machine", "Iso", "10-12", "À plat ventre, ramenez les talons aux fesses.", ""],
    ["Nordic curl", "Ischios", "Poids du corps", "Iso", "4-8", "Genoux bloqués, descendez le plus lentement possible.", ""],
    ["Glute ham raise", "Ischios", "Machine", "Iso", "6-10", "Sur le GHD, remontez avec les ischios.", "Fessiers"],
    ["Kettlebell swing", "Ischios", "Kettlebell", "Poly", "15-20", "Mouvement de hanches explosif, bras passifs.", "Fessiers, Lombaires"],

    /* ---------- Fessiers ---------- */
    ["Hip thrust", "Fessiers", "Barre", "Poly", "8-12", "Dos sur le banc, menton rentré, serrez en haut.", "Ischios"],
    ["Hip thrust machine", "Fessiers", "Machine", "Poly", "10-12", "Même mouvement, réglage plus rapide.", "Ischios"],
    ["Pont fessier", "Fessiers", "Poids du corps", "Iso", "15-20", "Au sol, poussez dans les talons.", "Ischios"],
    ["Pont fessier une jambe", "Fessiers", "Poids du corps", "Iso", "10-15/jambe", "Une jambe en l'air, bassin droit.", "Ischios"],
    ["Kickback poulie", "Fessiers", "Poulie", "Iso", "12-15/jambe", "Jambe vers l'arrière, sans cambrer.", ""],
    ["Abduction machine", "Fessiers", "Machine", "Iso", "15-20", "Buste penché vers l'avant : moyen fessier.", ""],
    ["Abduction élastique", "Fessiers", "Élastique", "Iso", "15-25", "Élastique au-dessus des genoux, écartez.", ""],
    ["Marche latérale élastique", "Fessiers", "Élastique", "Iso", "10-15 pas", "Petits pas de côté, genoux fléchis.", ""],
    ["Soulevé de terre sumo", "Fessiers", "Barre", "Poly", "3-6", "Pieds très écartés, buste plus droit.", "Adducteurs, Quadriceps"],
    ["Soulevé de terre trap bar", "Fessiers", "Trap bar", "Poly", "4-8", "Barre hexagonale : plus facile pour le dos.", "Quadriceps, Dos"],
    ["Frog pump", "Fessiers", "Poids du corps", "Iso", "20-30", "Plantes de pieds collées, pont rapide.", ""],
    ["Reverse hyper", "Fessiers", "Machine", "Iso", "12-15", "Montez les jambes tendues derrière vous.", "Lombaires, Ischios"],

    /* ---------- Adducteurs ---------- */
    ["Adduction machine", "Adducteurs", "Machine", "Iso", "12-15", "Resserrez les cuisses, retour lent.", ""],
    ["Copenhague", "Adducteurs", "Poids du corps", "Iso", "15-30 s/côté", "Gainage latéral, jambe du dessus sur un banc.", "Abdos"],
    ["Squat sumo haltère", "Adducteurs", "Haltères", "Poly", "10-15", "Pieds écartés, pointes vers l'extérieur.", "Fessiers, Quadriceps"],
    ["Fente latérale", "Adducteurs", "Haltères", "Poly", "8-10/côté", "Grand pas de côté, l'autre jambe tendue.", "Quadriceps, Fessiers"],

    /* ---------- Mollets ---------- */
    ["Mollets debout", "Mollets", "Machine", "Iso", "10-15", "Montée complète, pause en haut, descente étirée.", ""],
    ["Mollets assis", "Mollets", "Machine", "Iso", "12-20", "Genoux fléchis : soléaire.", ""],
    ["Mollets presse", "Mollets", "Machine", "Iso", "12-15", "Pointes de pieds au bas du plateau.", ""],
    ["Mollets une jambe", "Mollets", "Haltères", "Iso", "12-15/jambe", "Sur une marche, haltère dans la main.", ""],
    ["Mollets Smith", "Mollets", "Smith", "Iso", "10-15", "Sur un step, barre guidée sur les épaules.", ""],
    ["Tibial raise", "Mollets", "Poids du corps", "Iso", "15-25", "Dos au mur, relevez les pointes de pieds.", ""],

    /* ---------- Corps entier ---------- */
    ["Épaulé", "Corps entier", "Barre", "Poly", "2-5", "Tirage explosif, réception de la barre sur les épaules.", "Trapèzes, Quadriceps"],
    ["Épaulé-jeté", "Corps entier", "Barre", "Poly", "1-3", "Épaulé puis jeté au-dessus de la tête.", "Épaules, Quadriceps"],
    ["Arraché", "Corps entier", "Barre", "Poly", "1-3", "D'un seul mouvement du sol aux bras tendus.", "Épaules, Trapèzes"],
    ["Thruster", "Corps entier", "Barre", "Poly", "8-12", "Squat avant enchaîné avec un développé.", "Épaules, Quadriceps"],
    ["Burpees", "Corps entier", "Poids du corps", "Poly", "10-20", "Planche, pompe, saut : en continu.", "Pecs, Quadriceps"],
    ["Kettlebell snatch", "Corps entier", "Kettlebell", "Poly", "8-12/bras", "Du sol aux bras tendus d'un mouvement.", "Épaules"],
    ["Turkish get-up", "Corps entier", "Kettlebell", "Poly", "3-5/côté", "Du sol à debout, kettlebell bras tendu.", "Épaules, Abdos"],
    ["Wall ball", "Corps entier", "Médecine-ball", "Poly", "15-20", "Squat puis lancer contre une cible au mur.", "Quadriceps, Épaules"],
    ["Sled push", "Corps entier", "Traîneau", "Poly", "20-40 m", "Poussez le traîneau buste penché.", "Quadriceps, Mollets"],
    ["Corde ondulatoire", "Corps entier", "Corde", "Poly", "20-40 s", "Vagues rapides et alternées.", "Épaules, Abdos"],
    ["Rameur (fractionné)", "Corps entier", "Machine", "Poly", "250-500 m", "Jambes, puis buste, puis bras.", "Dos, Quadriceps"],
    ["Assault bike", "Corps entier", "Machine", "Poly", "20-60 s", "Sprint bras et jambes.", "Quadriceps"],
    ["Corde à sauter", "Corps entier", "Corde", "Poly", "1-3 min", "Petits rebonds sur l'avant du pied.", "Mollets"],
  ];
  /* Illustrations (départ, arrivée) : « Exercise data by RepDB (repdb.co) », utilisées selon leur licence (attribution). */
  const IMG = {"Développé couché":["bench-press-start.webp","bench-press-peak.webp"],"Développé couché haltères":["db-bench-press-start.webp","db-bench-press-peak.webp"],"Développé incliné barre":["incline-bench-press-start.webp","incline-bench-press-peak.webp"],"Développé incliné haltères":["incline-db-press-start.webp","incline-db-press-peak.webp"],"Développé décliné":["decline-bench-press-barbell-start.webp","decline-bench-press-barbell-peak.webp"],"Développé couché prise serrée":["close-grip-bench-press-start.webp","close-grip-bench-press-peak.webp"],"Développé couché Smith":["smith-machine-bench-press-start.webp","smith-machine-bench-press-peak.webp"],"Développé machine convergente":["chest-press-machine-start.webp","chest-press-machine-peak.webp"],"Développé sol haltères":["dumbbell-floor-press-start.webp","dumbbell-floor-press-peak.webp"],"Écarté couché haltères":["db-fly-start.webp","db-fly-peak.webp"],"Écarté incliné haltères":["incline-dumbbell-fly-start.webp","incline-dumbbell-fly-peak.webp"],"Écarté poulie":["cable-fly-start.webp","cable-fly-peak.webp"],"Écarté poulie basse":["cable-fly-start.webp","cable-fly-peak.webp"],"Pec deck":["pec-deck-start.webp","pec-deck-peak.webp"],"Pompes":["push-up-start.webp","push-up-peak.webp"],"Pompes lestées":["push-up-start.webp","push-up-peak.webp"],"Pompes déclinées":["decline-push-up-start.webp","decline-push-up-peak.webp"],"Pompes diamant":["diamond-push-ups-start.webp","diamond-push-ups-peak.webp"],"Dips buste penché":["dips-start.webp","dips-peak.webp"],"Pull-over haltère":["db-pullover-start.webp","db-pullover-peak.webp"],"Svend press":["svend-press-start.webp","svend-press-peak.webp"],"Tractions":["pull-up-start.webp","pull-up-peak.webp"],"Tractions lestées":["weighted-pull-up-start.webp","weighted-pull-up-peak.webp"],"Tractions supination":["chin-ups-start.webp","chin-ups-peak.webp"],"Tractions prise neutre":["neutral-grip-pull-ups-start.webp","neutral-grip-pull-ups-peak.webp"],"Tractions assistées":["assisted-pull-ups-start.webp","assisted-pull-ups-peak.webp"],"Tirage vertical":["lat-pulldown-start.webp","lat-pulldown-peak.webp"],"Tirage vertical prise serrée":["v-bar-lat-pulldown-start.webp","v-bar-lat-pulldown-peak.webp"],"Tirage bras tendus":["straight-arm-pulldown-start.webp","straight-arm-pulldown-peak.webp"],"Tirage horizontal":["seated-cable-row-start.webp","seated-cable-row-peak.webp"],"Rowing barre":["barbell-row-start.webp","barbell-row-peak.webp"],"Rowing Pendlay":["pendlay-row-start.webp","pendlay-row-peak.webp"],"Rowing haltère un bras":["single-arm-db-row-start.webp","single-arm-db-row-peak.webp"],"Rowing T-bar":["t-bar-row-start.webp","t-bar-row-peak.webp"],"Rowing poitrine appuyée":["chest-supported-db-row-start.webp","chest-supported-db-row-peak.webp"],"Rowing machine":["chest-supported-machine-row-start.webp","chest-supported-machine-row-peak.webp"],"Rowing inversé":["inverted-row-start.webp","inverted-row-peak.webp"],"Rowing Meadows":["t-bar-row-start.webp","t-bar-row-peak.webp"],"Seal row":["chest-supported-db-row-start.webp","chest-supported-db-row-peak.webp"],"Pull-over poulie":["straight-arm-pulldown-start.webp","straight-arm-pulldown-peak.webp"],"Soulevé de terre":["deadlift-start.webp","deadlift-peak.webp"],"Rack pull":["rack-pull-start.webp","rack-pull-peak.webp"],"Shrugs barre":["shrug-start.webp","shrug-peak.webp"],"Shrugs haltères":["db-shrug-start.webp","db-shrug-peak.webp"],"Shrugs trap bar":["shrug-start.webp","shrug-peak.webp"],"Tirage menton":["upright-row-start.webp","upright-row-peak.webp"],"Farmer walk":["dumbbell-farmers-walk-main.webp"],"Y-raise incliné":["trx-y-fly-start.webp","trx-y-fly-peak.webp"],"Extension lombaire":["back-extension-start.webp","back-extension-peak.webp"],"Good morning":["good-morning-start.webp","good-morning-peak.webp"],"Superman":["superman-start.webp","superman-peak.webp"],"Bird dog":["bird-dog-start.webp","bird-dog-peak.webp"],"Développé militaire":["ohp-start.webp","ohp-peak.webp"],"Développé haltères assis":["seated-db-press-start.webp","seated-db-press-peak.webp"],"Développé Arnold":["arnold-press-start.webp","arnold-press-peak.webp"],"Développé machine épaules":["machine-shoulder-press-start.webp","machine-shoulder-press-peak.webp"],"Push press":["push-press-start.webp","push-press-peak.webp"],"Landmine press":["landmine-press-start.webp","landmine-press-peak.webp"],"Élévations latérales":["lateral-raise-start.webp","lateral-raise-peak.webp"],"Élévations latérales poulie":["cable-lateral-raise-start.webp","cable-lateral-raise-peak.webp"],"Élévations latérales machine":["plate-loaded-lateral-raise-start.webp","plate-loaded-lateral-raise-peak.webp"],"Élévations frontales":["dumbbell-front-raise-start.webp","dumbbell-front-raise-peak.webp"],"Oiseau":["rear-delt-fly-start.webp","rear-delt-fly-peak.webp"],"Reverse pec deck":["machine-reverse-fly-start.webp","machine-reverse-fly-peak.webp"],"Face pull":["face-pull-start.webp","face-pull-peak.webp"],"Rotation externe poulie":["cable-external-rotation-start.webp","cable-external-rotation-peak.webp"],"Pompes piquées":["pike-push-ups-start.webp","pike-push-ups-peak.webp"],"Pompes en équilibre":["handstand-push-ups-start.webp","handstand-push-ups-peak.webp"],"Curl barre":["barbell-curl-start.webp","barbell-curl-peak.webp"],"Curl barre EZ":["ez-bar-curl-start.webp","ez-bar-curl-peak.webp"],"Curl haltères":["bicep-curl-start.webp","bicep-curl-peak.webp"],"Curl marteau":["hammer-curl-start.webp","hammer-curl-peak.webp"],"Curl incliné":["incline-db-curl-start.webp","incline-db-curl-peak.webp"],"Curl pupitre":["preacher-curl-start.webp","preacher-curl-peak.webp"],"Curl concentré":["concentration-curl-start.webp","concentration-curl-peak.webp"],"Curl poulie":["cable-curl-start.webp","cable-curl-peak.webp"],"Curl araignée":["spider-curl-start.webp","spider-curl-peak.webp"],"Curl Bayesian":["cable-curl-start.webp","cable-curl-peak.webp"],"Curl machine":["machine-bicep-curl-start.webp","machine-bicep-curl-peak.webp"],"Dips":["straight-bar-dips-start.webp","straight-bar-dips-peak.webp"],"Dips lestés":["weighted-dips-start.webp","weighted-dips-peak.webp"],"Dips sur banc":["bench-dips-start.webp","bench-dips-peak.webp"],"Barre au front":["skull-crusher-start.webp","skull-crusher-peak.webp"],"Extension triceps poulie":["tricep-pushdown-start.webp","tricep-pushdown-peak.webp"],"Extension triceps corde":["tricep-pushdown-start.webp","tricep-pushdown-peak.webp"],"Extension nuque haltère":["overhead-tricep-extension-start.webp","overhead-tricep-extension-peak.webp"],"Extension nuque poulie":["cable-overhead-tricep-extension-start.webp","cable-overhead-tricep-extension-peak.webp"],"Kickback":["tricep-kickback-start.webp","tricep-kickback-peak.webp"],"Extension unilatérale poulie":["single-arm-tricep-pushdown-start.webp","single-arm-tricep-pushdown-peak.webp"],"JM press":["close-grip-bench-press-start.webp","close-grip-bench-press-peak.webp"],"Curl poignets":["wrist-curl-start.webp","wrist-curl-peak.webp"],"Curl poignets inversé":["db-reverse-wrist-curl-start.webp","db-reverse-wrist-curl-peak.webp"],"Curl inversé":["reverse-curl-start.webp","reverse-curl-peak.webp"],"Suspension barre":["dead-hang-main.webp"],"Pince disques":["plate-pinch-start.webp","plate-pinch-peak.webp"],"Crunch":["crunches-start.webp","crunches-peak.webp"],"Crunch poulie":["cable-crunch-start.webp","cable-crunch-peak.webp"],"Crunch machine":["machine-seated-crunch-start.webp","machine-seated-crunch-peak.webp"],"Relevé de jambes suspendu":["hanging-leg-raise-start.webp","hanging-leg-raise-peak.webp"],"Relevé de genoux chaise romaine":["captains-chair-knee-raise-start.webp","captains-chair-knee-raise-peak.webp"],"Relevé de jambes au sol":["lying-leg-raise-start.webp","lying-leg-raise-peak.webp"],"Gainage":["plank-main.webp"],"Gainage latéral":["side-plank-main.webp"],"Roue abdominale":["ab-wheel-rollout-start.webp","ab-wheel-rollout-peak.webp"],"Russian twist":["russian-twist-start.webp","russian-twist-peak.webp"],"Pallof press":["cable-pallof-press-start.webp","cable-pallof-press-peak.webp"],"Bûcheron poulie":["medicine-ball-side-throw-start.webp","medicine-ball-side-throw-peak.webp"],"Dead bug":["dead-bug-start.webp","dead-bug-peak.webp"],"Hollow hold":["hollow-body-hold-main.webp"],"Mountain climbers":["mountain-climbers-start.webp","mountain-climbers-peak.webp"],"Dragon flag":["dragon-flag-start.webp","dragon-flag-peak.webp"],"Squat":["squat-start.webp","squat-peak.webp"],"Squat avant":["front-squat-start.webp","front-squat-peak.webp"],"Squat Smith":["smith-machine-squat-start.webp","smith-machine-squat-peak.webp"],"Squat gobelet":["goblet-squat-start.webp","goblet-squat-peak.webp"],"Hack squat":["hack-squat-start.webp","hack-squat-peak.webp"],"Pendulum squat":["hack-squat-start.webp","hack-squat-peak.webp"],"Presse à cuisses":["leg-press-start.webp","leg-press-peak.webp"],"Leg extension":["leg-extension-start.webp","leg-extension-peak.webp"],"Fentes marchées":["walking-lunge-start.webp","walking-lunge-peak.webp"],"Fentes arrière":["reverse-lunge-start.webp","reverse-lunge-peak.webp"],"Fentes bulgares":["bulgarian-split-squat-start.webp","bulgarian-split-squat-peak.webp"],"Step-up":["step-ups-start.webp","step-ups-peak.webp"],"Sissy squat":["sissy-squat-start.webp","sissy-squat-peak.webp"],"Squat sauté":["jump-squat-start.webp","jump-squat-peak.webp"],"Chaise":["wall-sit-main.webp"],"Squat pistol":["pistol-squat-start.webp","pistol-squat-peak.webp"],"Soulevé de terre roumain":["romanian-deadlift-start.webp","romanian-deadlift-peak.webp"],"Soulevé de terre jambes tendues":["stiff-leg-deadlift-start.webp","stiff-leg-deadlift-peak.webp"],"Soulevé de terre roumain haltères":["dumbbell-romanian-deadlift-start.webp","dumbbell-romanian-deadlift-peak.webp"],"Soulevé de terre une jambe":["single-leg-romanian-deadlift-start.webp","single-leg-romanian-deadlift-peak.webp"],"Leg curl":["leg-curl-start.webp","leg-curl-peak.webp"],"Leg curl assis":["seated-leg-curl-start.webp","seated-leg-curl-peak.webp"],"Leg curl allongé":["leg-curl-start.webp","leg-curl-peak.webp"],"Nordic curl":["nordic-hamstring-curl-start.webp","nordic-hamstring-curl-peak.webp"],"Glute ham raise":["nordic-hamstring-curl-start.webp","nordic-hamstring-curl-peak.webp"],"Kettlebell swing":["kettlebell-swing-start.webp","kettlebell-swing-peak.webp"],"Hip thrust":["hip-thrust-start.webp","hip-thrust-peak.webp"],"Hip thrust machine":["plate-loaded-glute-drive-start.webp","plate-loaded-glute-drive-peak.webp"],"Pont fessier":["glute-bridge-start.webp","glute-bridge-peak.webp"],"Pont fessier une jambe":["single-leg-glute-bridge-start.webp","single-leg-glute-bridge-peak.webp"],"Kickback poulie":["cable-kickback-start.webp","cable-kickback-peak.webp"],"Abduction machine":["hip-abduction-start.webp","hip-abduction-peak.webp"],"Abduction élastique":["banded-seated-hip-abduction-start.webp","banded-seated-hip-abduction-peak.webp"],"Marche latérale élastique":["banded-lateral-walk-start.webp","banded-lateral-walk-peak.webp"],"Soulevé de terre sumo":["sumo-deadlift-start.webp","sumo-deadlift-peak.webp"],"Soulevé de terre trap bar":["hex-bar-deadlift-start.webp","hex-bar-deadlift-peak.webp"],"Frog pump":["glute-bridge-start.webp","glute-bridge-peak.webp"],"Reverse hyper":["back-extension-start.webp","back-extension-peak.webp"],"Adduction machine":["hip-adduction-start.webp","hip-adduction-peak.webp"],"Copenhague":["copenhagen-plank-main.webp"],"Squat sumo haltère":["db-sumo-squat-start.webp","db-sumo-squat-peak.webp"],"Fente latérale":["side-lunge-start.webp","side-lunge-peak.webp"],"Mollets debout":["standing-calf-raise-start.webp","standing-calf-raise-peak.webp"],"Mollets assis":["seated-calf-raise-start.webp","seated-calf-raise-peak.webp"],"Mollets presse":["machine-calf-raise-start.webp","machine-calf-raise-peak.webp"],"Mollets une jambe":["single-leg-calf-raise-start.webp","single-leg-calf-raise-peak.webp"],"Mollets Smith":["smith-machine-calf-raise-start.webp","smith-machine-calf-raise-peak.webp"],"Tibial raise":["kettlebell-tibialis-raise-start.webp","kettlebell-tibialis-raise-peak.webp"],"Épaulé":["hang-power-clean-start.webp","hang-power-clean-peak.webp"],"Épaulé-jeté":["clean-and-jerk-start.webp","clean-and-jerk-peak.webp"],"Arraché":["snatch-start.webp","snatch-peak.webp"],"Thruster":["thruster-start.webp","thruster-peak.webp"],"Burpees":["burpees-main.webp"],"Kettlebell snatch":["double-kettlebell-swing-snatch-start.webp","double-kettlebell-swing-snatch-peak.webp"],"Turkish get-up":["kettlebell-turkish-get-ups-start.webp","kettlebell-turkish-get-ups-peak.webp"],"Wall ball":["wall-ball-main.webp"],"Sled push":["sled-push-main.webp"],"Corde ondulatoire":["battle-ropes-main.webp"],"Rameur (fractionné)":["rowing-machine-start.webp","rowing-machine-peak.webp"],"Assault bike":["air-bike-main.webp"],"Corde à sauter":["jump-rope-main.webp"]};
  const slug = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const LIB = L.map(([name, muscle, equip, type, reps, tip, sec]) => ({ id: slug(name), name, muscle, equip, type, reps, tip, sec, sets: type === "Poly" ? 4 : 3, img: (IMG[name] || []).map((f) => "img/ex/" + f) }));
  const MUSCLES = ["Pecs", "Dos", "Trapèzes", "Lombaires", "Épaules", "Biceps", "Triceps", "Avant-bras", "Abdos", "Quadriceps", "Ischios", "Fessiers", "Adducteurs", "Mollets", "Corps entier"];
  const EQUIP = Array.from(new Set(LIB.map((e) => e.equip))).sort((a, b) => a.localeCompare(b, "fr"));
  window.TempoExercices = { list: LIB, muscles: MUSCLES, equipment: EQUIP, byId: (id) => LIB.find((e) => e.id === id) };
})();
