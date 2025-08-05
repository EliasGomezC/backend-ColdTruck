const mongoose = require("mongoose");

const TrackingSchema = new mongoose.Schema(
    {
        _id: { type: String, required: true },
        type: { type: String, enum: ['Point'], required: true },
        coordinates: {
            type: [Number],
            required: true,
            validate: {
                validator: arr => Array.isArray(arr) && arr.length === 2,
                message: 'Coordinates must be [lng, lat]'
            }
        },
        dateTime: { type: Date, required: true },
        IDTrip: { type: Number, required: true, ref: 'Trip' }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Tracking', TrackingSchema, 'tracking');
