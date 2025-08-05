const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/autoIncrementId");

const AlertSchema = new mongoose.Schema(
    {
        IDAlert: { type: Number, required: true },
        type: { type: String, required: true },
        description: { type: String, required: true },
        dateTime: { type: Date, required: true },
        temperature: Number,
        humidity: Number,
    },
    { _id: false }
);

const TripSchema = new mongoose.Schema(
    {
        _id: { type: Number, unique: true },
        scheduledDepartureDate: { type: Date, required: true },
        scheduledArrivalDate: { type: Date, required: true },
        actualDepartureDate: Date,
        actualArrivalDate: Date,
        estimatedDistance: { type: Number, required: true },
        status: {
            type: String,
            enum: ['Completed', 'In Transit', 'Canceled', 'Scheduled'],
            default: 'Scheduled',
            required: true
        },
        IDDriver: { type: Number, required: true, ref: 'User' },
        IDAdmin: { type: Number, required: true, ref: 'User' },
        IDBox: { type: Number, required: true, ref: 'Box' },
        IDRute: { type: Number, required: true, ref: 'Rute' },
        IDTruck: { type: Number, required: true, ref: 'Truck' },
        IDCargoType: { type: Number, required: true },
        alerts: [AlertSchema]
    },
    { _id: false, timestamps: true }
);

TripSchema.pre('save', autoIncrementId('Trip'));

module.exports = mongoose.model('Trip', TripSchema, 'trip');
