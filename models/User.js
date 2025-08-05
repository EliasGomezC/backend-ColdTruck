const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/autoIncrementId");

// Counter schema for auto-incrementing user IDs
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", CounterSchema);

// User schema with auto-incrementing _id
const UserSchema = new mongoose.Schema({
  _id: {
    type: Number,
    unique: true,
  },
  name: { type: String, required: true },
  lastName: { type: String, required: true },
  secondLastName: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  license: { type: String },
  registrationDate: { type: Date, default: Date.now },
  profilePicture: { type: String, required: true },
  status: {
    type: String,
    enum: ["Available", "On Trip", "Unavailable", "Disabled"],
    default: "Available",
    required: true,
  },
  role: { type: String, enum: ["admin", "driver"], required: true },
});

// Pre-save middleware to auto-increment _id
UserSchema.pre("save",autoIncrementId('User'));

module.exports = mongoose.model("User", UserSchema, 'user');
