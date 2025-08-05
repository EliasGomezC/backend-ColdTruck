const mongoose = require('mongoose');
const autoIncrementId = require('../plugins/autoIncrementId');

const AlertSchema = new mongoose.Schema(
    {
        _id: { type: Number, unique: true },
        type: {
            type: String,
            required: true,
            enum: [
                'Cancellation',
                'Route Started',
                'Route Ended',
                'High Temperature',
                'Low Temperature'
            ]
        },
        description: { type: String, required: true }
    },
    { _id: false }
);

AlertSchema.pre('save', autoIncrementId('Alert'));

module.exports = mongoose.model('Alert', AlertSchema, 'alert');