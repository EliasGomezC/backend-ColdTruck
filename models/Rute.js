const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/autoIncrementId");

const pointSchema = {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: {
        type: [Number],
        required: true,
        validate: {
            validator: arr => Array.isArray(arr) && arr.length === 2,
            message: 'Coordinates must be [lng, lat]'
        }
    }
};

const RuteSchema = new mongoose.Schema(
    {
        _id: { type: Number, unique: true },
        name: { type: String, required: true, trim: true },
        maxTemp: { type: Number, required: true },
        minTemp: { type: Number, required: true },
        maxHum: { type: Number, required: true },
        minHum: { type: Number, required: true },
        origin: pointSchema,
        destination: pointSchema,
        IDAdmin: { type: Number, required: true }
    },
    { _id: false, timestamps: true }
);

RuteSchema.pre('save', autoIncrementId('Rute'));

module.exports = mongoose.model('Rute', RuteSchema, 'rute');
