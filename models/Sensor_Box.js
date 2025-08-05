const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/autoIncrementId");

const Sensor_BoxSchema = new mongoose.Schema(
    {
        _id: { type: Number, unique: true },
        IDSensor: { type: String, required: true, ref: 'Sensor' },
        IDBox: { type: Number, required: true, ref: 'Box' },
        dateStart: { type: Date, required: true, default: Date.now },
        dateEnd: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        }
    }
);

Sensor_BoxSchema.pre('save', autoIncrementId('Sensor_Box'));

module.exports = mongoose.model('Sensor_Box', Sensor_BoxSchema, 'sensor_box');
