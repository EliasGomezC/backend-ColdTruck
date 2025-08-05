const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/autoIncrementId");

const CargoTypeSchema = new mongoose.Schema(
    {
        _id: { type: Number, unique: true },
        name: { type: String, required: true },
        description: { type: String, required: true }
    }
);

CargoTypeSchema.pre('save', autoIncrementId('CargoType'));

module.exports = mongoose.model('CargoType', CargoTypeSchema, 'cargoType');