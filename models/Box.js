const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/autoIncrementId");

const BoxSchema = new mongoose.Schema(
    {
        _id: { type: Number, unique: true },
        status: {
            type: String,
            enum: ['Available', 'On Trip', 'Under Maintenance', 'Inactive'],
            default: 'Available'
        },
        length: { type: Number, required: true },
        width: { type: Number, required: true },
        height: { type: Number, required: true },
        maxWeigth: { type: Number, required: true },
        IDAdmin: { type: Number, required: true, ref: 'User' }
    }
);

BoxSchema.pre('save', autoIncrementId('Box'));

module.exports = mongoose.model('Box', BoxSchema, 'box');
