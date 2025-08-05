const express = require("express");
const CargoType = require("../models/CargoType");

const router = express.Router();

    router.get("/", async (_req, res) => {
        try {
            const cargoType = await CargoType.find();
            res.json(cargoType);
        } catch (error) {
            console.error("GET /cargoType", error);
            res.status(500).json({ error: "Error getting boxs" });
        }
    });

    router.post('/', async (req, res) => {
        try {
            const cargo = new CargoType({
                name: req.body.name,
                description: req.body.description,
            });
            await cargo.save();
            res.status(201).json(cargo);
        } catch (error) {
            console.error(error);
            res.status(400).json({ error: 'Error saving Cargo Type' });
        }
    });

    router.put('/:id', async (req, res) => {
        try {
            const updatedCargoType = await CargoType.findByIdAndUpdate(
                req.params.id,
                {
                    name: req.body.name,
                    description: req.body.description
                },
                { new: true, runValidators: true }
            );

            if (!updatedCargoType) {
                return res.status(404).json({ error: 'CargoType not found' });
            }

            res.json(updatedCargoType);
        } catch (error) {
            console.error('PUT /cargoType/:id', error);
            res.status(400).json({ error: 'Error updating box' });
        }
    });

module.exports = router;
