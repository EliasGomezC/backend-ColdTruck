const express = require("express")
const Truck = require('../models/Truck');

const router = express.Router()

router.get('/', async (req, res) => {
    try {
        const trucks = await Truck.find()
        .populate('IDBrand', 'name')
        .populate('IDModel', 'name');
        res.json(trucks);
    } catch (error) {
        res.status(500).json({ error: 'Error getting trucks' });
    }
    });

    router.post('/', async (req, res) => {
    try {
        const truck = new Truck(req.body);
        await truck.save();
        res.status(201).json(truck);
    } catch (error) {
        res.status(400).json({ error: 'Error saving truck' });
    }
});

router.get('/Available', async (req, res) => {
    try {
        const trucks = await Truck.find({ status: 'Available' })
            .populate('IDBrand', 'name')
            .populate('IDModel', 'name');
        res.json(trucks);
    } catch (error) {
        console.error("GET /trucks error:", error);
        res.status(500).json({ error: 'Error getting trucks' });
    }
});


router.put('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const truck = await Truck.findById(id);
        if (!truck) {
            return res.status(404).json({ error: 'Truck not found' });
        }

        const { plates, loadCapacity, status, IDBrand, IDModel } = req.body;
        if (plates !== undefined) truck.plates = plates;
        if (loadCapacity !== undefined) truck.loadCapacity = loadCapacity;
        if (status !== undefined) truck.status = status;
        if (IDBrand !== undefined) truck.IDBrand = IDBrand;
        if (IDModel !== undefined) truck.IDModel = IDModel;

        await truck.save();

        const updated = await Truck.findById(id)
            .populate('IDBrand', 'name')
            .populate('IDModel', 'name');
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: 'Error updating truck' });
    }
});

router.get('/count/trucks/available', async (req, res) => {
    try {
        const count = await Truck.countDocuments({ status: "Available" });

        return res.json({
            availableTrucks: count
        });
    } catch (error) {
        console.error('Error counting available trucks:', error);
        return res.status(500).json({ error: 'Error retrieving available trucks' });
    }
});

module.exports = router
