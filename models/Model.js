// models/Model.js
const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/autoIncrementId");

const ModelSchema = new mongoose.Schema(
    {
        _id: Number,
        name: { type: String, required: true, unique: true, trim: true },
        IDBrand: { type: Number, ref: 'Brand', required: true },
    },
    { _id: false, timestamps: true }
);

ModelSchema.pre('save', autoIncrementId('Model'));

module.exports =  mongoose.model('Model', ModelSchema, "model");
