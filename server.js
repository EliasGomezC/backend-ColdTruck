const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const dotenv = require("dotenv")

dotenv.config()

const app = express()

// Models
const userModel = require('./models/User');
const boxModel = require('./models/Box');
const ruteModel = require('./models/Rute');
const truckModel = require('./models/Truck');
const tripModel = require('./models/Trip');
const cargoTypeModel = require('./models/CargoType');
const alertModel = require('./models/Alert');
const sensorReadingModel = require('./models/SensorReading');


// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use("/api/auth", require("./routes/auth"))
app.use("/api/brands", require("./routes/brand.routes"))
app.use('/api/models', require('./routes/model.routes'))
app.use('/api/trucks', require('./routes/truck.routes'))
app.use('/api/rutes', require('./routes/rute.routes'))
app.use('/api/trips', require('./routes/trip.routes'))
app.use('/api/boxs', require('./routes/box.routes'))
app.use('/api/cargoType', require('./routes/cargoType.routes'))
app.use('/api/sensors', require('./routes/sensor.routes'))
app.use('/api/sensor_box', require('./routes/sensor_box.routes'))
app.use('/api/alerts', require('./routes/alert.routes'))
app.use('/api/sensor_readings', require('./routes/sensorReading.routes'))
app.use('/api/tracking', require('./routes/tracking.routes'))

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/truck_system", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err))

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
