const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET offre spéciale (public)
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM offre WHERE id = 1');
        if (result.rows.length === 0) {
            // Retourner une offre par défaut si pas configurée
            return res.json({
                titre: "📦 Pack Complet - Toutes les matières",
                description: "Accédez à l'intégralité de nos formations",
                prix_actuel: 800,
                prix_ancien: 1200,
                reduction: 400,
                actif: true
            });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erreur GET offre:', error);
        res.status(500).json({ error: 'Erreur lors du chargement de l\'offre' });
    }
});

// PUT modifier l'offre (admin)
router.put('/', authenticateToken, async (req, res) => {
    const { titre, description, prix_actuel, prix_ancien, reduction, actif } = req.body;

    if (!titre || !prix_actuel || !prix_ancien) {
        return res.status(400).json({ error: 'Titre et prix sont requis' });
    }

    const reductionCalculee = reduction || (prix_ancien - prix_actuel);
    
    if (prix_actuel >= prix_ancien) {
        return res.status(400).json({ error: 'Le prix actuel doit être inférieur au prix ancien' });
    }

    try {
        // Vérifier si l'offre existe
        const check = await db.query('SELECT * FROM offre WHERE id = 1');
        
        if (check.rows.length === 0) {
            await db.query(
                `INSERT INTO offre (id, titre, description, prix_actuel, prix_ancien, reduction, actif)
                 VALUES (1, $1, $2, $3, $4, $5, $6)`,
                [titre, description || '', prix_actuel, prix_ancien, reductionCalculee, actif !== undefined ? actif : true]
            );
        } else {
            await db.query(
                `UPDATE offre 
                 SET titre = $1, description = $2, prix_actuel = $3, prix_ancien = $4, 
                     reduction = $5, actif = $6, updated_at = NOW()
                 WHERE id = 1`,
                [titre, description || '', prix_actuel, prix_ancien, reductionCalculee, actif !== undefined ? actif : true]
            );
        }
        
        res.json({ 
            success: true, 
            message: 'Offre mise à jour avec succès',
            offre: { titre, description, prix_actuel, prix_ancien, reduction: reductionCalculee, actif }
        });
    } catch (error) {
        console.error('Erreur PUT offre:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'offre' });
    }
});

// POST activer/désactiver l'offre (admin)
router.post('/toggle', authenticateToken, async (req, res) => {
    const { actif } = req.body;

    try {
        await db.query(
            'UPDATE offre SET actif = $1, updated_at = NOW() WHERE id = 1',
            [actif]
        );
        res.json({ success: true, actif, message: actif ? 'Offre activée' : 'Offre désactivée' });
    } catch (error) {
        console.error('Erreur toggle offre:', error);
        res.status(500).json({ error: 'Erreur lors de la modification' });
    }
});

module.exports = router;
