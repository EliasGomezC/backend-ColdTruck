const express = require('express');
const Tracking = require('../models/Tracking');

const router = express.Router();

// Get tracking points for a specific trip
router.get('/trip/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const points = await Tracking.find({ IDTrip: Number(id) }).sort({ dateTime: 1 });
        return res.json(points);
    } catch (err) {
        console.error('Error getting tracking data:', err);
        return res.status(500).json({ error: 'Error getting tracking data' });
    }
});

module.exports = router;
