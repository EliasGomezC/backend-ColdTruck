const express = require('express');
const Rute = require('../models/Rute');

const ORS_URL = 'https://api.openrouteservice.org/v2/directions/driving-car';

const router = express.Router();

router.get('/', async (_req, res) => {
    try {
        const rutes = await Rute.find();
        res.json(rutes);
    } catch (err) {
        res.status(500).json({ error: 'Error getting routes' });
    }
});

async function getGeometry(origin, destination) {
   try {
        const response = await fetch(ORS_URL, {
            method: 'POST',
            headers: {
                'Authorization': process.env.ORS_API_KEY || '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ coordinates: [origin, destination] })
        });
        if (!response.ok) {
            throw new Error('OpenRouteService error');
        }
        const data = await response.json();
        return data.features[0].geometry.coordinates;
    } catch (err) {
        // Fallback to OSRM if OpenRouteService fails or API key is missing
        const [oLng, oLat] = origin;
        const [dLng, dLat] = destination;
        const url = `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error('OSRM error');
        }
        const osrmData = await res.json();
        return osrmData.routes[0].geometry.coordinates;
    }
    }
    router.get('/:id/geometry', async (req, res) => {
    try {
        const rute = await Rute.findById(Number(req.params.id));
        if (!rute) return res.status(404).json({ error: 'Route not found' });
        const coords = await getGeometry(rute.origin.coordinates, rute.destination.coordinates);
        res.json(coords);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching geometry' });
    }
});

router.post('/', async (req, res) => {
    try {
        const rute = new Rute(req.body);
        const saved = await rute.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: 'Error saving route' });
    }
});

module.exports = router;