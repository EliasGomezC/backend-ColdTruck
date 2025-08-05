const express = require("express");
const Box = require("../models/Box");

const router = express.Router();

    router.get("/", async (_req, res) => {
        try {
            const boxs = await Box.find().populate('IDAdmin').sort({ _id: 1 });
            res.json(boxs);
        } catch (error) {
            console.error("GET /boxs", error);
            res.status(500).json({ error: "Error getting boxs" });
        }
    });


    router.get("/Available", async (_req, res) => {
        try {
            const boxs = await Box.find({ status: 'Available' }).populate('IDAdmin');
            res.json(boxs);
        } catch (error) {
            console.error("GET /boxs", error);
            res.status(500).json({ error: "Error getting boxs" });
        }
    });

    router.post('/', async (req, res) => {
        try {
            const box = new Box({
                status: req.body.status,
                length: req.body.length,
                width: req.body.width,
                height: req.body.height,
                maxWeigth: req.body.maxWeigth,
                IDAdmin: req.body.IDAdmin,
            });
            await box.save();
            res.status(201).json(box);
        } catch (error) {
            console.error(error);
            res.status(400).json({ error: 'Error saving box' });
        }
    });

    router.put('/:id', async (req, res) => {
        try {
            const updatedBox = await Box.findByIdAndUpdate(
                req.params.id,
                {
                    status: req.body.status,
                    length: req.body.length,
                    width: req.body.width,
                    height: req.body.height,
                    maxWeigth: req.body.maxWeigth
                },
                { new: true, runValidators: true }
            );

            if (!updatedBox) {
                return res.status(404).json({ error: 'Box not found' });
            }

            res.json(updatedBox);
        } catch (error) {
            console.error('PUT /boxs/:id', error);
            res.status(400).json({ error: 'Error updating box' });
        }
    });

module.exports = router;
