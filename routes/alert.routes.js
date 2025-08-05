const express = require('express');
const Alert = require('../models/Alert');

const router = express.Router();

router.get('/', async (_req, res) => {
    try {
        const alerts = await Alert.find();
        res.json(alerts);
    } catch (error) {
        console.error('GET /alerts', error);
        res.status(500).json({ error: 'Error getting alerts' });
    }
});

router.post('/', async (req, res) => {
    try {
        const alert = new Alert({
            type: req.body.type,
            description: req.body.description
        });
        await alert.save();
        res.status(201).json(alert);
    } catch (error) {
        console.error('POST /alerts', error);
        res.status(400).json({ error: 'Error saving alert' });
    }
});

module.exports = router;