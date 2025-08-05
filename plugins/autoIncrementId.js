// plugins/autoIncrementId.js
const mongoose = require("mongoose");

/**
 * Genera un middleware pre-save que autoincrementa _id
 * usando la colección "counters".
 */
function autoIncrementId(modelName) {
    return async function (next) {
        if (!this.isNew) return next();               // solo para inserts

        const { value } = await mongoose.connection
        .collection("counters")
        .findOneAndUpdate(
            { _id: modelName },
            { $inc: { seq: 1 } },
            { upsert: true, returnDocument: "after" }
        );

        this._id = value.seq;
        next();
    };
}

module.exports = autoIncrementId;                 // 👈 CommonJS export
