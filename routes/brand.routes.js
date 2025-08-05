const express = require("express");
const Brand = require("../models/Brand");
const Model = require('../models/Model');

const router = express.Router();

router.get("/", async (_req, res) => {
    try {
        const brands = await Brand.find().sort("name");
        res.json(brands);
    } catch (error) {
        console.error("GET /brands", error);
        res.status(500).json({ error: "Error getting brands" });
    }
});

router.post("/", async (req, res) => {
    try {
        const { name } = req.body;
        if (!name?.trim()) {
            return res.status(400).json({ error: "Name is required" });
        }

        const exists = await Brand.findOne({ name: new RegExp(`^${name}$`, "i") });
        if (exists) {
            return res.status(409).json({ error: "Brand already exists" });
        }

        const brand = new Brand({ name: name.trim() });
        const saved = await brand.save();
        res.status(201).json(saved);
    } catch (error) {
        console.error("POST /brands", error);
        res.status(500).json({ error: "Error saving brand" });
    }
});

router.get("/models", async (_req, res) => {
    try {
        // Usar agregación para obtener marcas junto con sus modelos
        const brandsWithModels = await Brand.aggregate([
            {
                $lookup: {
                    from: "model", // Nombre de la colección de modelos
                    localField: "_id", // Campo de la marca que coincide con el campo de referencia en Model
                    foreignField: "IDBrand", // Campo de Model que hace referencia al campo _id de Brand
                    as: "models", // Nombre del campo en el resultado que contendrá los modelos
                },
            },
            {
                $sort: { name: 1 }, // Ordenar por nombre de la marca
            },
        ]);

        res.json(brandsWithModels);
    } catch (error) {
        console.error("GET /brands", error);
        res.status(500).json({ error: "Error getting brands and models" });
    }
});

router.put("/:id", async (req, res) => {
    const { id } = req.params;
    let { name } = req.body;

    // Si no se proporciona ningún campo
    if (!name) {
        return res.status(400).json({ error: "Name is required" });
    }

    name = name.trim();
    if (!name) {
        return res.status(400).json({ error: "Name cannot be empty" });
    }

    try {
        // Verifica si otra marca ya tiene ese nombre (ignorando mayúsculas/minúsculas)
        const duplicate = await Brand.findOne({ name: new RegExp(`^${name}$`, "i"), _id: { $ne: Number(id) } });
        if (duplicate) {
            return res.status(409).json({ error: "Brand name already exists" });
        }

        const updatedBrand = await Brand.findOneAndUpdate(
            { _id: Number(id) },
            { name },
            { new: true }
        );

        if (!updatedBrand) {
            return res.status(404).json({ error: "Brand not found" });
        }

        res.json(updatedBrand);
    } catch (error) {
        console.error("PUT /brands/:id", error);
        res.status(500).json({ error: "Error updating brand" });
    }
});


module.exports = router;
