// models/Truck.js
const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/autoIncrementId");

const TruckSchema = new mongoose.Schema(
    {
        _id: {
            type: Number,
            unique: true,
        },
        plates: {
            type: String,
            required: true,
            trim: true
        },
        status: {
            type: String,
            enum: ['Available', 'On Trip', 'Under Maintenance', 'Inactive'],
            default: 'Available',
        },
        loadCapacity: {
            type: Number,
            required: true
        },
        IDAdmin: {
            type: Number,
            required: true
        },
        IDBrand: {
            type: Number,
            ref: 'Brand',
            required: true
        },
        IDModel: {
            type: Number,
            ref: 'Model',
            required: true
        },
    },
    { _id: false, timestamps: true }
);

TruckSchema.pre('save', autoIncrementId('Truck'));

module.exports = mongoose.model('Truck', TruckSchema, "truck");