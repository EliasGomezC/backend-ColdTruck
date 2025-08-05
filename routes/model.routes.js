const express = require("express")
const Model = require('../models/Model');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const filter = req.query.IDBrand ? { IDBrand: req.query.IDBrand } : {};
        const models = await Model.find(filter).sort('name');
        res.json(models);
    } catch (error) {
        res.status(500).json({ error: 'Error getting models' });
    }
});

router.get("/", async (req, res) => {
    try {
        const { IDBrand } = req.query;
        const filter = IDBrand ? { IDBrand: Number(IDBrand) } : {};

        const models = await Model.find(filter).sort("name");
        res.json(models);
    } catch (error) {
        console.error("GET /models", error);
        res.status(500).json({ error: "Error getting models" });
    }
});

router.post('/', async (req, res) => {
    try {
        const model = new Model({
            name: req.body.name,
            IDBrand: req.body.IDBrand,
        });
        await model.save();
        res.status(201).json(model);
    } catch (error) {
        res.status(400).json({ error: 'Error saving model' });
    }
});

router.post("/", async (req, res) => {
    try {
        const { name, IDBrand } = req.body;
        const model = new Model({ name, IDBrand });
        const saved = await model.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: "Error saving model" });
    }
});

router.put("/:id", async (req, res) => {
    const { id } = req.params;
    let { name, IDBrand } = req.body;

    const updateFields = {};

    // Si se proporciona name, validarlo y agregarlo
    if (name !== undefined) {
        name = name.trim();
        if (!name) {
            return res.status(400).json({ error: "Name cannot be empty" });
        }

        // Verificar si ya existe otro modelo con ese nombre
        const duplicate = await Model.findOne({ name, _id: { $ne: Number(id) } });
        if (duplicate) {
            return res.status(409).json({ error: "Model name already exists" });
        }

        updateFields.name = name;
    }

    // Si se proporciona IDBrand, convertirlo a Number y agregarlo
    if (IDBrand !== undefined) {
        IDBrand = Number(IDBrand);
        if (isNaN(IDBrand)) {
            return res.status(400).json({ error: "IDBrand must be a valid number" });
        }
        updateFields.IDBrand = IDBrand;
    }

    if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ error: "No valid fields provided for update" });
    }

    try {
        const updatedModel = await Model.findOneAndUpdate(
            { _id: Number(id) },
            updateFields,
            { new: true }
        );

        if (!updatedModel) {
            return res.status(404).json({ error: "Model not found" });
        }

        res.json(updatedModel);
    } catch (error) {
        console.error("PUT /models/:id", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router