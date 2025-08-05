const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/autoIncrementId");

const BrandSchema = new mongoose.Schema(
    {
        _id: Number,
        name: { type: String, required: true, unique: true, trim: true },
    },
    { _id: false, timestamps: true }
);

BrandSchema.pre("save", autoIncrementId("Brand"));

module.exports = mongoose.model("Brand", BrandSchema, "brand");
