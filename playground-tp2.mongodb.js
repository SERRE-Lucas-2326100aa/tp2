// ============================================================================
// TP2 : Requêtage avancé et pipeline d'agrégation MongoDB
// Fichier d'exercices interactif - BUT3 Informatique
// ============================================================================
//
// INFORMATIONS ÉTUDIANT (à compléter)
// ------------------------------------
// Nom      : SERRE
// Prénom   : Lucas
// Groupe   : 3G1
// Date     : 01/12/2025
//
// ============================================================================
//
// Instructions :
// 1. Ouvrir ce fichier dans VS Code avec l'extension MongoDB for VS Code
// 2. Connectez-vous à votre cluster Atlas
// 3. Exécutez les blocs de code avec Ctrl+Alt+R (ou clic droit > Run)
// 4. Complétez les exercices dans les zones "// TODO"
// 5. Committez régulièrement votre travail
//
// Correspondance exercices README ↔ Playground :
// ----------------------------------------------
// - Exercice 1 → README Section 1.2 ($elemMatch)
// - Exercice 2 → README Section 1.2 ($elemMatch avec dates)
// - Exercice 3 → README Section 1.2 ($elemMatch avec $or)
// - Exercice 4 → README Section 1.3 ($expr avec $size)
// - Exercice 5 → README Section 1.3 ($expr comparaison)
// - Exercice 6 → README Section 1.4 (Validation de données)
// - Exercice 7 → README Section 2.4 (Pipeline $group)
// - Exercice 8 → README Section 2.5 (Pipeline $match + $group)
// - Exercice 9 → README Section 2.4 (Pipeline $addToSet)
// - Exercice 10 → README Section 3.3 ($unwind + $group)
// - Exercice 11 → README Section 3.3 ($unwind analyse)
// - Exercice 12 → README Section 4.1 ($lookup)
// - Exercice 13 → README Section 4.2 ($bucket)
// - Exercice 14 → README Section 4.3 ($facet)
// - Exercice 15 → README Section 5.3 (Index composé)
// - Exercice 16 → README Section 5.5 (Index géospatial)
//
// ============================================================================

// ----------------------------------------------------------------------------
// CONFIGURATION INITIALE
// ----------------------------------------------------------------------------

// Sélectionner la base de données sample_restaurants
use("sample_restaurants");

// Vérifier que les données sont bien chargées
db.restaurants.countDocuments();
// Résultat attendu : ~25359 documents

// Voir la structure d'un document
db.restaurants.findOne();

// Vérifier la collection neighborhoods
db.neighborhoods.countDocuments();
// Résultat attendu : ~195 documents


// ############################################################################
// PHASE 1 : REQUÊTES AVANCÉES AVEC FIND()
// ############################################################################

// ============================================================================
// EXERCICE 1 : $elemMatch simple
// ============================================================================
// Objectif : Restaurants avec grade "B" ET score < 10 dans la MÊME inspection
//
// EXPLICATION :
// Sans $elemMatch, les conditions sont évaluées indépendamment :
//   "grades.grade": "B"      → cherche un "B" quelque part
//   "grades.score": {$lt:10} → cherche un score < 10 quelque part
//   → Ces deux conditions peuvent être satisfaites par des éléments DIFFÉRENTS
//
// Avec $elemMatch, un SEUL élément doit satisfaire TOUTES les conditions
// ============================================================================

// SOLUTION :
db.restaurants.find({
    grades: {
        $elemMatch: {
            grade: "B",
            score: { $lt: 10 }
        }
    }
});

// Vérification du nombre de résultats
db.restaurants.countDocuments({
    grades: { $elemMatch: { grade: "B", score: { $lt: 10 } } }
});
// Résultat attendu : ~2800 documents


// ============================================================================
// EXERCICE 2 : $elemMatch avec plage de dates
// ============================================================================
// Objectif : Restaurants inspectés en 2014 avec grade "A"
//
// EXPLICATION :
// Les dates MongoDB sont des objets ISODate. Pour filtrer une année,
// on définit une plage : du 1er janvier 2014 au 1er janvier 2015 (exclu)
// ============================================================================

// SOLUTION :
db.restaurants.find({
    grades: {
        $elemMatch: {
            grade: "A",
            date: {
                $gte: ISODate("2014-01-01T00:00:00Z"),
                $lt: ISODate("2015-01-01T00:00:00Z")
            }
        }
    }
});

// Vérification
db.restaurants.countDocuments({
    grades: {
        $elemMatch: {
            grade: "A",
            date: { $gte: ISODate("2014-01-01"), $lt: ISODate("2015-01-01") }
        }
    }
});
// Résultat attendu : ~18000 documents


// ============================================================================
// EXERCICE 3 : $elemMatch avec $or
// ============================================================================
// Objectif : Restaurants avec au moins une mauvaise inspection
//            (grade "C" OU score > 30)
//
// EXPLICATION :
// On utilise $or à l'INTÉRIEUR de $elemMatch pour que les conditions
// alternatives s'appliquent au même élément du tableau
// ============================================================================

// SOLUTION :
db.restaurants.find({
    grades: {
        $elemMatch: {
            $or: [
                { grade: "C" },
                { score: { $gt: 30 } }
            ]
        }
    }
});

// Vérification
db.restaurants.countDocuments({
    grades: { $elemMatch: { $or: [{ grade: "C" }, { score: { $gt: 30 } }] } }
});
// Résultat attendu : ~4500 documents


// ============================================================================
// EXERCICE 4 : $expr avec $size
// ============================================================================
// Objectif : Restaurants avec exactement 4 inspections
//
// EXPLICATION :
// $expr permet d'utiliser des opérateurs d'agrégation dans find()
// $size retourne la taille d'un tableau
// $eq compare deux valeurs pour l'égalité
// ============================================================================

// SOLUTION :
db.restaurants.find({
    $expr: {
        $eq: [{ $size: "$grades" }, 4]
    }
});

// Vérification
db.restaurants.countDocuments({
    $expr: { $eq: [{ $size: "$grades" }, 4] }
});
// Résultat attendu : ~3500 documents

// ALTERNATIVE avec $size dans la requête (exactement N éléments) :
db.restaurants.countDocuments({ grades: { $size: 4 } });
// Note : Cette syntaxe ne fonctionne que pour l'égalité exacte


// ============================================================================
// EXERCICE 5 : Comparer des éléments du tableau
// ============================================================================
// Objectif : Restaurants améliorés (dernier score < premier score)
//
// EXPLICATION :
// $arrayElemAt extrait un élément à un index donné :
//   - Index 0 = premier élément
//   - Index -1 = dernier élément
// Un score plus bas est meilleur, donc on cherche où dernier < premier
// ============================================================================

// SOLUTION :
db.restaurants.find({
    $expr: {
        $lt: [
            { $arrayElemAt: ["$grades.score", -1] },  // Dernier score
            { $arrayElemAt: ["$grades.score", 0] }    // Premier score
        ]
    }
});

// Note : Cette requête peut retourner des résultats inattendus si grades est vide
// Version robuste :
db.restaurants.find({
    $expr: {
        $and: [
            { $gt: [{ $size: "$grades" }, 1] },  // Au moins 2 inspections
            { $lt: [
                { $arrayElemAt: ["$grades.score", -1] },
                { $arrayElemAt: ["$grades.score", 0] }
            ]}
        ]
    }
});


// ============================================================================
// EXERCICE 6 : Validation de données
// ============================================================================
// Objectif : Restaurants où borough est manquant ou vide
//
// EXPLICATION :
// $exists: false vérifie que le champ n'existe pas
// borough: "" vérifie que le champ existe mais est une chaîne vide
// ============================================================================

// SOLUTION :
db.restaurants.find({
    $or: [
        { borough: { $exists: false } },
        { borough: "" }
    ]
});

// Version plus complète incluant null :
db.restaurants.find({
    $or: [
        { borough: { $exists: false } },
        { borough: null },
        { borough: "" }
    ]
});


// ============================================================================
// CHECKPOINT PHASE 1
// ============================================================================
// Avant de passer à la Phase 2, vérifiez que vous avez compris :
//
// ✅ $elemMatch : Toutes les conditions sur le MÊME élément du tableau
// ✅ $expr : Utiliser des expressions d'agrégation dans find()
// ✅ $size, $arrayElemAt : Manipuler les tableaux
// ✅ $exists, $type : Valider la structure des documents
//
// Si vous bloquez sur un exercice, passez au suivant et revenez-y plus tard.
// ============================================================================


// ############################################################################
// PHASE 2 : INTRODUCTION AU PIPELINE D'AGRÉGATION
// ############################################################################

// ============================================================================
// EXERCICE 7 : Pipeline simple - Comptage par quartier
// ============================================================================
// Objectif : Nombre de restaurants par quartier, trié décroissant
//
// EXPLICATION :
// $group avec _id définit le champ de regroupement
// $sum: 1 compte le nombre de documents dans chaque groupe
// $sort: {count: -1} trie par count décroissant
// ============================================================================

// SOLUTION :
db.restaurants.aggregate([
    {
        $group: {
            _id: "$borough",
            count: { $sum: 1 }
        }
    },
    {
        $sort: { count: -1 }
    }
]);

// Résultat attendu :
// Manhattan: ~10259, Brooklyn: ~6086, Queens: ~5656, Bronx: ~2338, Staten Island: ~969


// ============================================================================
// EXERCICE 8 : Pipeline avec filtre - Top cuisines à Manhattan
// ============================================================================
// Objectif : Top 5 des cuisines à Manhattan
//
// EXPLICATION :
// L'ordre des étapes est important :
// 1. $match d'abord pour réduire les données (performance)
// 2. $group pour compter par cuisine
// 3. $sort pour ordonner
// 4. $limit pour garder les 5 premiers
// ============================================================================

// SOLUTION :
db.restaurants.aggregate([
    { $match: { borough: "Manhattan" } },
    { $group: {
        _id: "$cuisine",
        count: { $sum: 1 }
    }},
    { $sort: { count: -1 } },
    { $limit: 5 }
]);

// Résultat attendu :
// American: ~3205, Café/Coffee/Tea: ~1039, Italian: ~932, Chinese: ~826, Japanese: ~517


// ============================================================================
// EXERCICE 9 : Groupement avec $addToSet
// ============================================================================
// Objectif : Nombre de cuisines différentes par quartier
//
// EXPLICATION :
// $addToSet collecte les valeurs UNIQUES (comme un Set)
// $size dans $project compte le nombre d'éléments
// ============================================================================

// SOLUTION :
db.restaurants.aggregate([
    {
        $group: {
            _id: "$borough",
            cuisines: { $addToSet: "$cuisine" }
        }
    },
    {
        $project: {
            _id: 0,
            quartier: "$_id",
            nb_cuisines: { $size: "$cuisines" }
        }
    },
    {
        $sort: { nb_cuisines: -1 }
    }
]);

// Résultat attendu :
// Manhattan: ~75, Brooklyn: ~70, Queens: ~70, Bronx: ~53, Staten Island: ~45

// ============================================================================
// CHECKPOINT PHASE 2
// ============================================================================
// Avant de passer à la Phase 3, vérifiez que vous maîtrisez :
//
// ✅ $match : Filtrer (équivalent WHERE en SQL)
// ✅ $group : Regrouper avec _id et accumulateurs ($sum, $addToSet)
// ✅ $sort : Trier les résultats (1 = croissant, -1 = décroissant)
// ✅ $limit : Limiter le nombre de résultats
//
// Rappel SQL → MongoDB :
// SELECT borough, COUNT(*) FROM restaurants GROUP BY borough ORDER BY count DESC
// →  [{ $group: {_id: "$borough", count: {$sum: 1}} }, { $sort: {count: -1} }]
// ============================================================================


// ############################################################################
// PHASE 3 : TRANSFORMATION DES DONNÉES
// ############################################################################

// ============================================================================
// EXERCICE 10 : $unwind + $group - Score moyen par année
// ============================================================================
// Objectif : Score moyen par année pour toutes les inspections
//
// EXPLICATION :
// $unwind transforme : {grades: [{...}, {...}]} → 2 documents séparés
// $year extrait l'année d'une date
// $avg calcule la moyenne
// ============================================================================

// SOLUTION :
db.restaurants.aggregate([
    { $unwind: "$grades" },
    {
        $group: {
            _id: { $year: "$grades.date" },
            avg_score: { $avg: "$grades.score" },
            count: { $sum: 1 }
        }
    },
    { $sort: { _id: 1 } }
]);

// Résultat attendu (approximatif) :
// 2011: avg_score ~9.8
// 2012: avg_score ~10.5
// 2013: avg_score ~11.2
// 2014: avg_score ~11.8


// ============================================================================
// EXERCICE 11 : Analyse par quartier - Inspections
// ============================================================================
// Objectif : Nombre total d'inspections et score moyen par quartier
//
// EXPLICATION :
// Attention : on compte les INSPECTIONS, pas les restaurants
// Il faut d'abord $unwind pour avoir une ligne par inspection
// ============================================================================

// SOLUTION :
db.restaurants.aggregate([
    { $unwind: "$grades" },
    {
        $group: {
            _id: "$borough",
            nb_inspections: { $sum: 1 },
            score_moyen: { $avg: "$grades.score" }
        }
    },
    {
        $project: {
            _id: 0,
            quartier: "$_id",
            nb_inspections: 1,
            score_moyen: { $round: ["$score_moyen", 1] }
        }
    },
    { $sort: { nb_inspections: -1 } }
]);

// Résultat attendu :
// Manhattan: ~50000 inspections, Brooklyn: ~29000, Queens: ~27000...


// ============================================================================
// CHECKPOINT PHASE 3
// ============================================================================
// Avant de passer à la Phase 4, vérifiez que vous comprenez :
//
// ✅ $unwind : Dérouler un tableau en plusieurs documents
//    { grades: [{A}, {B}] } → deux documents : {grades: {A}} et {grades: {B}}
//
// ✅ $project : Remodeler les documents (sélectionner, renommer, calculer)
// ✅ $addFields : Ajouter des champs sans perdre les existants
//
// Astuce : $unwind est essentiel pour analyser les éléments individuels
//          d'un tableau (comme les grades/inspections)
// ============================================================================


// ############################################################################
// PHASE 4 : AGRÉGATIONS AVANCÉES
// ############################################################################

// Préparation : Créer la collection des quartiers (exécuter une fois)
// db.boroughs.drop();
// db.boroughs.insertMany([
//     { _id: "Manhattan", population: 1628706, area_km2: 59.1 },
//     { _id: "Brooklyn", population: 2559903, area_km2: 183.4 },
//     { _id: "Queens", population: 2253858, area_km2: 283.0 },
//     { _id: "Bronx", population: 1418207, area_km2: 110.0 },
//     { _id: "Staten Island", population: 476143, area_km2: 151.1 }
// ]);

// // Vérification
// db.boroughs.find();


// ============================================================================
// Exercice 12 : Jointure avec $lookup
// ============================================================================
// Objectif : Créer un rapport montrant pour chaque quartier :
//            - Le nombre de restaurants
//            - La population du quartier
//            - La densité (nb_restaurants / population * 10000)
// Difficulté : ⭐⭐⭐ (3/3)
//
// Étapes :
//   1. $group par borough pour compter les restaurants
//   2. $lookup vers la collection boroughs
//   3. $unwind le résultat de la jointure
//   4. $project pour calculer la densité avec $divide
//
// ============================================================================

// TODO : Compléter le pipeline


// ============================================================================
// Exercice 13 : Histogramme avec $bucket
// ============================================================================
// Objectif : Créer un histogramme du nombre de restaurants par nombre
//            d'inspections : 0, 1-2, 3-4, 5-6, 7+
// Difficulté : ⭐⭐⭐ (3/3)
//
// Étapes :
//   1. $addFields pour calculer le nombre d'inspections ($size)
//   2. $bucket avec boundaries: [0, 1, 3, 5, 7, 20]
//
// ============================================================================

// TODO : Compléter le pipeline


// ============================================================================
// Exercice 14 : Dashboard avec $facet
// ============================================================================
// Objectif : Créer un $facet qui produit en une seule requête :
//            1. Le nombre de restaurants par quartier
//            2. La distribution des grades (A, B, C, etc.)
//            3. Le top 3 des cuisines à Manhattan
// Difficulté : ⭐⭐⭐ (3/3)
//
// ============================================================================

// TODO : Compléter le pipeline
// db.restaurants.aggregate([
//     { $facet: {
//         // Pipeline 1 : Restaurants par quartier
//         par_quartier: [
//             // TODO
//         ],

//         // Pipeline 2 : Distribution des grades
//         distribution_grades: [
//             // TODO
//         ],

//         // Pipeline 3 : Top 3 cuisines à Manhattan
//         top_manhattan: [
//             // TODO
//         ]
//     }}
// ]);


// ============================================================================
// CHECKPOINT PHASE 4
// ============================================================================
// Félicitations ! Vous maîtrisez maintenant les agrégations avancées :
//
// ✅ $lookup : Jointures entre collections (comme LEFT JOIN en SQL)
// ✅ $bucket : Créer des histogrammes par tranches
// ✅ $facet : Exécuter plusieurs pipelines en parallèle
//
// Ces opérateurs sont puissants pour créer des dashboards analytiques !
// ============================================================================


// ############################################################################
// PHASE 5 : INDEX ET OPTIMISATION
// ############################################################################

// ============================================================================
// Exercice 15 : Optimisation de requête
// ============================================================================
// Objectif : Optimiser cette requête avec les index appropriés
// Difficulté : ⭐⭐⭐ (3/3)
//
// Requête à optimiser :
// db.restaurants.find({
//     borough: "Brooklyn",
//     cuisine: "Italian"
// }).sort({ name: 1 })
// ============================================================================

// Étape 1 : Mesurer AVANT optimisation
// Noter : totalDocsExamined, executionTimeMillis, stage
// db.restaurants.find({
//     borough: "Brooklyn",
//     cuisine: "Italian"
// }).sort({ name: 1 }).explain("executionStats");

// Étape 2 : Créer l'index optimal
// TODO : Quel index créer ?
// db.restaurants.createIndex({ ... })


// Étape 3 : Mesurer APRÈS optimisation
// db.restaurants.find({
//     borough: "Brooklyn",
//     cuisine: "Italian"
// }).sort({ name: 1 }).explain("executionStats");

// Voir tous les index
// db.restaurants.getIndexes();


// ============================================================================
// Exercice 16 : Recherche géospatiale
// ============================================================================
// Objectif : Trouver les 5 restaurants italiens les plus proches de
//            Central Park (coordonnées : [-73.965355, 40.782865])
// Difficulté : ⭐⭐⭐ (3/3)
//
// Étapes :
//   1. Créer l'index géospatial sur address.coord
//   2. Utiliser $nearSphere avec $geometry
//   3. Filtrer par cuisine: "Italian"
//   4. Limiter à 5 résultats
// ============================================================================

// Étape 1 : Créer l'index géospatial
// db.restaurants.createIndex({ "address.coord": "2dsphere" });

// TODO : Compléter la requête


// ############################################################################
// PHASE 6 : MINI-PROJET DASHBOARD
// ############################################################################

// ============================================================================
// Challenge : Dashboard analytique complet
// ============================================================================
// Objectif : Créer UNE SEULE requête d'agrégation avec $facet qui produit
//            toutes les métriques pour un tableau de bord
// Difficulté : ⭐⭐⭐ (3/3) - Challenge avancé
//
// Le dashboard doit contenir :
//
// 1. Vue d'ensemble (overview)
//    - Nombre total de restaurants
//    - Nombre de types de cuisine différents
//
// 2. Top 5 des quartiers (top_quartiers)
//    - Par nombre de restaurants
//    - Avec le score moyen des inspections
//
// 3. Distribution des grades (distribution_grades)
//    - Nombre d'inspections par grade (A, B, C, etc.)
//
// 4. Evolution annuelle (evolution_annuelle)
//    - Score moyen par année (2012-2014)
//
// ============================================================================

// TODO : Compléter le pipeline
 // SOLUTION COMPLÈTE :
db.restaurants.aggregate([
    {
        $facet: {
            // ============================================
            // Vue d'ensemble
            // ============================================
            overview: [
                {
                    $group: {
                        _id: null,
                        total_restaurants: { $sum: 1 },
                        cuisines: { $addToSet: "$cuisine" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        total_restaurants: 1,
                        total_cuisines: { $size: "$cuisines" }
                    }
                }
            ],

            // ============================================
            // Top 5 des quartiers
            // ============================================
            top_quartiers: [
                { $unwind: "$grades" },
                {
                    $group: {
                        _id: "$borough",
                        nb_restaurants: { $addToSet: "$_id" },
                        score_moyen: { $avg: "$grades.score" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        quartier: "$_id",
                        nb_restaurants: { $size: "$nb_restaurants" },
                        score_moyen: { $round: ["$score_moyen", 1] }
                    }
                },
                { $sort: { nb_restaurants: -1 } },
                { $limit: 5 }
            ],

            // ============================================
            // Distribution des grades
            // ============================================
            distribution_grades: [
                { $unwind: "$grades" },
                {
                    $group: {
                        _id: "$grades.grade",
                        count: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        grade: "$_id",
                        count: 1
                    }
                },
                { $sort: { grade: 1 } }
            ],

            // ============================================
            // Evolution annuelle
            // ============================================
            evolution_annuelle: [
                { $unwind: "$grades" },
                {
                    $group: {
                        _id: { $year: "$grades.date" },
                        score_moyen: { $avg: "$grades.score" },
                        nb_inspections: { $sum: 1 }
                    }
                },
                {
                    $match: {
                        _id: { $gte: 2012, $lte: 2014 }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        annee: "$_id",
                        score_moyen: { $round: ["$score_moyen", 1] },
                        nb_inspections: 1
                    }
                },
                { $sort: { annee: 1 } }
            ]
        }
    }
]);


// ============================================================================
// CHECKLIST DE VALIDATION - AUTO-ÉVALUATION
// ============================================================================
//
// Cochez [x] chaque exercice terminé et fonctionnel.
// Objectif : Terminer au minimum les exercices obligatoires.
//
// ============================================================================
// PHASE 1 - Requêtes avancées (Obligatoire)
// ============================================================================
// [ ] Exercice 1 : $elemMatch simple              (~2800 résultats)
// [ ] Exercice 2 : $elemMatch avec dates          (~18000 résultats)
// [ ] Exercice 3 : $elemMatch avec $or            (~4500 résultats)
// [ ] Exercice 4 : $expr avec $size               (~3500 résultats)
// [ ] Exercice 5 : Comparaison d'éléments         (exercice avancé)
// [ ] Exercice 6 : Validation de données
//
// ============================================================================
// PHASE 2 - Pipeline d'agrégation (Obligatoire)
// ============================================================================
// [ ] Exercice 7 : Comptage par quartier          (5 quartiers)
// [ ] Exercice 8 : Top cuisines Manhattan         (top 5)
// [ ] Exercice 9 : Cuisines par quartier          (avec $addToSet)
//
// ============================================================================
// PHASE 3 - Transformation (Obligatoire)
// ============================================================================
// [ ] Exercice 10 : Score moyen par année         (utilise $unwind)
// [ ] Exercice 11 : Inspections par quartier      (nb inspections, pas restaurants)
//
// ============================================================================
// PHASE 4 - Agrégations avancées (Recommandé)
// ============================================================================
// [ ] Exercice 12 : Jointure $lookup              (densité restaurants)
// [ ] Exercice 13 : Histogramme $bucket           (par nb inspections)
// [ ] Exercice 14 : Dashboard $facet              (3 facettes)
//
// ============================================================================
// PHASE 5 - Optimisation (Recommandé)
// ============================================================================
// [ ] Exercice 15 : Index composé                 (borough + cuisine + name)
// [ ] Exercice 16 : Index géospatial              (2dsphere + $nearSphere)
//
// ============================================================================
// PHASE 6 - Mini-projet Dashboard API (Obligatoire)
// ============================================================================
// [ ] Challenge : Dashboard $facet complet
// [ ] API : Routes stats.js implémentées
// [ ] Tests : npm run test:api passe
// [ ] Dashboard : Graphiques affichés correctement
//
// ============================================================================
// RÉCAPITULATIF
// ============================================================================
//
// Exercices obligatoires (phases 1-3 + phase 6) : ____ / 12
// Exercices recommandés (phases 4-5) :           ____ / 5
// Total :                                        ____ / 17
//
// Notes et remarques :
// ___________________________________________________________________
// ___________________________________________________________________
// ___________________________________________________________________
//
// ============================================================================


// ============================================================================
// FIN DU TP2
// ============================================================================
// Prochain TP : Modélisation avancée et patterns de conception MongoDB
//
// N'oubliez pas de :
// 1. Committer ce fichier : git add playground-tp2.mongodb.js
// 2. Committer stats.js :   git add dashboard-api/src/routes/stats.js
// 3. Pousser sur GitHub :   git push
// ============================================================================
