const express = require('express');
const Rute = require('../models/Rute');
const Trip = require('../models/Trip');
const User = require('../models/User');
const Truck = require('../models/Truck');
const Box = require('../models/Box');

const AlertType = require('../models/Alert');
const Driver = require('../models/User');

const router = express.Router();

async function getDistance(origin, destination) {
    const url = 'https://api.openrouteservice.org/v2/directions/driving-car';

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': process.env.ORS_API_KEY || '',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            coordinates: [origin, destination]
        })
    });

    const data = await response.json();
    console.log('ORS response:', JSON.stringify(data));

    if (!data.routes || !data.routes[0] || !data.routes[0].summary || typeof data.routes[0].summary.distance !== 'number') {
        throw new Error('Invalid OpenRouteService response: ' + JSON.stringify(data));
    }
    return data.routes[0].summary.distance;
}


router.get('/', async (_req, res) => {
    try {
        const trips = await Trip.find();
        res.json(trips);
    } catch (err) {
        res.status(500).json({ error: 'Error getting trips' });
    }
});

router.get('/specific', async (_req, res) => {
    try {
        const trips = await Trip
            .find()
            .populate('IDDriver IDAdmin IDBox IDRute IDTruck IDCargoType');
        return res.json(trips);
    } catch (err) {
        console.error('Error getting trips:', err);
        return res.status(500).json({ error: 'Error getting trips' });
    }
});

router.get('/specific/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const trip = await Trip.findById(id)
            .populate('IDDriver IDAdmin IDBox IDRute IDTruck IDCargoType');

        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        return res.json(trip);
    } catch (err) {
        console.error('Error getting trip by ID:', err);
        return res.status(500).json({ error: 'Error getting trip by ID' });
    }
});

router.post('/', async (req, res) => {
    try {
        const {
            scheduledDepartureDate,
            scheduledArrivalDate,
            IDDriver,
            IDAdmin,
            IDBox,
            IDRute,
            IDTruck,
            IDCargoType
        } = req.body;

        const departure = new Date(scheduledDepartureDate);
        const arrival = new Date(scheduledArrivalDate);

        const timeOverlap = {
            scheduledDepartureDate: { $lt: arrival },
            scheduledArrivalDate: { $gt: departure }
        };

        const statusFilter = { status: { $in: ['Scheduled', 'In Transit'] } };

        const driverConflict = await Trip.findOne({ IDDriver, ...statusFilter, ...timeOverlap });
        if (driverConflict) {
            return res.status(400).json({
                error: 'El conductor ya tiene un viaje asignado en esas fechas',
                conflicto: {
                    scheduledDepartureDate: driverConflict.scheduledDepartureDate,
                    scheduledArrivalDate: driverConflict.scheduledArrivalDate
                }
            });
        }

        const truckConflict = await Trip.findOne({ IDTruck, ...statusFilter, ...timeOverlap });
        if (truckConflict) {
            return res.status(400).json({
                error: 'El camión ya tiene un viaje asignado en esas fechas',
                conflicto: {
                    scheduledDepartureDate: truckConflict.scheduledDepartureDate,
                    scheduledArrivalDate: truckConflict.scheduledArrivalDate
                }
            });
        }

        const boxConflict = await Trip.findOne({ IDBox, ...statusFilter, ...timeOverlap });
        if (boxConflict) {
            return res.status(400).json({
                error: 'La caja ya tiene un viaje asignado en esas fechas',
                conflicto: {
                    scheduledDepartureDate: boxConflict.scheduledDepartureDate,
                    scheduledArrivalDate: boxConflict.scheduledArrivalDate
                }
            });
        }


        const rute = await Rute.findById(Number(IDRute));
        if (!rute) {
            return res.status(404).json({ error: 'Route not found' });
        }

        // Validar estructura de coordenadas antes de llamar la API
        if (
            !rute.origin ||
            !Array.isArray(rute.origin.coordinates) ||
            rute.origin.coordinates.length !== 2 ||
            !rute.destination ||
            !Array.isArray(rute.destination.coordinates) ||
            rute.destination.coordinates.length !== 2
        ) {
            console.error('Invalid route coordinates:', rute);
            return res.status(400).json({ error: 'Invalid route coordinates' });
        }

        // Asegúrate que sean números
        const originCoords = rute.origin.coordinates.map(Number);
        const destinationCoords = rute.destination.coordinates.map(Number);

        // Logs para depuración
        console.log('Origin:', originCoords);
        console.log('Destination:', destinationCoords);

        // Llama a la API de rutas
        const distance = await getDistance(originCoords, destinationCoords);

        const trip = new Trip({
            scheduledDepartureDate,
            scheduledArrivalDate,
            estimatedDistance: distance,
            status: 'Scheduled',
            IDDriver,
            IDAdmin,
            IDBox,
            IDRute,
            IDTruck,
            IDCargoType
        });

        const saved = await trip.save();
        res.status(201).json(saved);
    } catch (err) {
        console.error('POST /trips', err);
        res.status(400).json({ error: 'Error creating trip', details: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { scheduledDepartureDate, scheduledArrivalDate, status } = req.body;

        const trip = await Trip.findById(id);
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        if (trip.status === 'Completed' || trip.status === 'Canceled') {
            return res.status(400).json({ error: 'Trip cannot be modified' });
        }

        if (status === 'Canceled') {
            trip.status = 'Canceled';
        }

        if (trip.status === 'Scheduled') {
            if (scheduledDepartureDate) {
                trip.scheduledDepartureDate = scheduledDepartureDate;
            }
            if (scheduledArrivalDate) {
                trip.scheduledArrivalDate = scheduledArrivalDate;
            }

            const newDeparture = new Date(trip.scheduledDepartureDate);
            const newArrival = new Date(trip.scheduledArrivalDate);
            const timeOverlap = {
                _id: { $ne: trip._id },
                scheduledDepartureDate: { $lt: newArrival },
                scheduledArrivalDate: { $gt: newDeparture },
                status: { $in: ['Scheduled', 'In Transit'] }
            };

            const driverConflict = await Trip.findOne({ IDDriver: trip.IDDriver, ...timeOverlap });
            if (driverConflict) {
                return res.status(400).json({
                    error: 'El conductor ya tiene un viaje asignado en esas fechas',
                    conflicto: {
                        scheduledDepartureDate: driverConflict.scheduledDepartureDate,
                        scheduledArrivalDate: driverConflict.scheduledArrivalDate
                    }
                });
            }

            const truckConflict = await Trip.findOne({ IDTruck: trip.IDTruck, ...timeOverlap });
            if (truckConflict) {
                return res.status(400).json({
                    error: 'El camión ya tiene un viaje asignado en esas fechas',
                    conflicto: {
                        scheduledDepartureDate: truckConflict.scheduledDepartureDate,
                        scheduledArrivalDate: truckConflict.scheduledArrivalDate
                    }
                });
            }

            const boxConflict = await Trip.findOne({ IDBox: trip.IDBox, ...timeOverlap });
            if (boxConflict) {
                return res.status(400).json({
                    error: 'La caja ya tiene un viaje asignado en esas fechas',
                    conflicto: {
                        scheduledDepartureDate: boxConflict.scheduledDepartureDate,
                        scheduledArrivalDate: boxConflict.scheduledArrivalDate
                    }
                });
            }

            const routeConflict = await Trip.findOne({ IDRute: trip.IDRute, ...timeOverlap });
            if (routeConflict) {
                return res.status(400).json({
                    error: 'La ruta ya está asignada en esas fechas',
                    conflicto: {
                        scheduledDepartureDate: routeConflict.scheduledDepartureDate,
                        scheduledArrivalDate: routeConflict.scheduledArrivalDate
                    }
                });
            }
        }

        await trip.save();

        if (trip.status === 'Canceled') {
            await Promise.all([
                User.findByIdAndUpdate(trip.IDDriver, { status: 'Available' }),
                Truck.findByIdAndUpdate(trip.IDTruck, { status: 'Available' }),
                Box.findByIdAndUpdate(trip.IDBox, { status: 'Available' })
            ]);
        }

        return res.json(trip);
    } catch (err) {
        console.error('Error updating trip:', err);
        return res.status(500).json({ error: 'Error updating trip' });
    }
});

router.post('/:id/start', async (req, res) => {
    try {
        const { id } = req.params;
        const trip = await Trip.findById(id);
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }
        if (trip.status !== 'Scheduled') {
            return res.status(400).json({ error: 'Trip cannot be started' });
        }

        trip.status = 'In Transit';
        trip.actualDepartureDate = new Date();
        await trip.save();

        await Promise.all([
            User.findByIdAndUpdate(trip.IDDriver, { status: 'On Trip' }),
            Truck.findByIdAndUpdate(trip.IDTruck, { status: 'On Trip' }),
            Box.findByIdAndUpdate(trip.IDBox, { status: 'On Trip' })
        ]);

        return res.json(trip);
    } catch (err) {
        console.error('Error starting trip:', err);
        return res.status(500).json({ error: 'Error starting trip' });
    }
});

router.post('/:id/complete', async (req, res) => {
    try {
        const { id } = req.params;
        const trip = await Trip.findById(id);
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }
        if (trip.status !== 'In Transit') {
            return res.status(400).json({ error: 'Trip cannot be completed' });
        }

        trip.status = 'Completed';
        trip.actualArrivalDate = new Date();
        await trip.save();

        await Promise.all([
            User.findByIdAndUpdate(trip.IDDriver, { status: 'Available' }),
            Truck.findByIdAndUpdate(trip.IDTruck, { status: 'Available' }),
            Box.findByIdAndUpdate(trip.IDBox, { status: 'Available' })
        ]);

        return res.json(trip);
    } catch (err) {
        console.error('Error completing trip:', err);
        return res.status(500).json({ error: 'Error completing trip' });
    }
});

router.post('/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        const trip = await Trip.findById(id);
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }
        if (trip.status === 'Completed' || trip.status === 'Canceled') {
            return res.status(400).json({ error: 'Trip cannot be canceled' });
        }

        trip.status = 'Canceled';
        await trip.save();

        await Promise.all([
            User.findByIdAndUpdate(trip.IDDriver, { status: 'Available' }),
            Truck.findByIdAndUpdate(trip.IDTruck, { status: 'Available' }),
            Box.findByIdAndUpdate(trip.IDBox, { status: 'Available' })
        ]);

        return res.json(trip);
    } catch (err) {
        console.error('Error canceling trip:', err);
        return res.status(500).json({ error: 'Error canceling trip' });
    }
});

// Get alerts for a specific trip
router.get('/:id/alerts', async (req, res) => {
    try {
        const { id } = req.params;
        const trip = await Trip.findById(id, 'alerts');
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }
        return res.json(trip.alerts);
    } catch (err) {
        console.error('Error getting trip alerts:', err);
        return res.status(500).json({ error: 'Error getting trip alerts' });
    }
});

router.get('/alerts/today', async (_req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setUTCHours(23, 59, 59, 999);

        const trips = await Trip.find({
            alerts: {
                $elemMatch: {
                    dateTime: {
                        $gte: startOfDay,
                        $lte: endOfDay
                    }
                }
            }
        });

        // Contar alertas dentro del rango
        let totalAlerts = 0;

        for (const trip of trips) {
            const todaysAlerts = trip.alerts.filter(alert => {
                const date = new Date(alert.dateTime);
                return date >= startOfDay && date <= endOfDay;
            });
            totalAlerts += todaysAlerts.length;
        }

        return res.json({ date: startOfDay.toISOString().slice(0, 10), totalAlerts });
    } catch (err) {
        console.error('Error counting today alerts:', err);
        return res.status(500).json({ error: 'Error counting alerts for today' });
    }
});

router.get('/count/today-trips', async (_req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setUTCHours(23, 59, 59, 999);

        const count = await Trip.countDocuments({
            scheduledDepartureDate: {
                $gte: startOfDay,
                $lte: endOfDay,
            },
        });

        return res.json({
            date: startOfDay.toISOString().slice(0, 10),
            tripsScheduledToday: count,
        });
    } catch (err) {
        console.error('Error counting today trips:', err);
        return res.status(500).json({ error: 'Error counting trips for today' });
    }
});

router.get('/count/completed-range', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: "Se requieren startDate y endDate en formato ISO." });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999); // incluir todo el último día

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: "Fechas inválidas." });
        }

        const count = await Trip.countDocuments({
            status: "Completed",
            actualArrivalDate: {
                $gte: start,
                $lte: end
            }
        });

        return res.json({
            startDate: start.toISOString().slice(0, 10),
            endDate: end.toISOString().slice(0, 10),
            completedTrips: count
        });
    } catch (error) {
        console.error('Error counting completed trips in range:', error);
        return res.status(500).json({ error: 'Error retrieving completed trips' });
    }
});

router.get('/count/active', async (_req, res) => {
    try {
        const count = await Trip.countDocuments({ status: "In Transit" });
        return res.json({ activeTrips: count });
    } catch (err) {
        console.error('Error counting active trips:', err);
        return res.status(500).json({ error: 'Error retrieving active trips' });
    }
});

router.get('/count/range', async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) return res.status(400).json({ error: "Faltan fechas." });

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    try {
        const count = await Trip.countDocuments({
            scheduledDepartureDate: { $gte: start, $lte: end }
        });

        return res.json({ startDate, endDate, totalTrips: count });
    } catch (err) {
        console.error('Error counting range trips:', err);
        return res.status(500).json({ error: 'Error retrieving trips' });
    }
});

router.get('/count/scheduled', async (req, res) => {
    try {
        const count = await Trip.countDocuments({ status: "Scheduled" });

        return res.json({
            scheduledTrips: count
        });
    } catch (error) {
        console.error('Error counting scheduled trips:', error);
        return res.status(500).json({ error: 'Error retrieving scheduled trips' });
    }
});

router.get('/alerts/ordered', async (req, res) => {
    try {
        const trips = await Trip.find(
            { alerts: { $exists: true, $ne: [] } },
            {
                alerts: 1,
                IDTruck: 1,
                IDBox: 1,
                IDDriver: 1
            }
        ).lean();

        let allAlerts = trips.flatMap(trip =>
            trip.alerts.map(alert => ({
                ...alert,
                tripId: trip._id,
                IDTruck: trip.IDTruck,
                IDBox: trip.IDBox,
                IDDriver: trip.IDDriver
            }))
        );

        // 🔧 Ajuste por hora local del servidor
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        allAlerts = allAlerts.filter(alert => {
            const dt = new Date(alert.dateTime);
            return dt >= startOfDay && dt <= endOfDay;
        });

        const driverIds = [...new Set(allAlerts.map(a => a.IDDriver))];
        const drivers = await Driver.find({ _id: { $in: driverIds } }).lean();
        const driverMap = Object.fromEntries(
            drivers.map(d => [
                d._id,
                {
                    name: d.name,
                    lastName: d.lastName,
                    secondLastName: d.secondLastName
                }
            ])
        );

        const alertIds = [...new Set(allAlerts.map(a => a.IDAlert))];
        const alertTypes = await AlertType.find({ IDAlert: { $in: alertIds } }).lean();
        const alertTypeMap = Object.fromEntries(
            alertTypes.map(a => [
                a.IDAlert,
                {
                    name: a.name,
                    description: a.description
                }
            ])
        );

        const formattedAlerts = allAlerts.map(alert => {
            const formatted = {
                IDAlert: alert.IDAlert,
                ...alertTypeMap[alert.IDAlert],
                dateTime: alert.dateTime,
                IDTrip: alert.tripId,
                IDTruck: alert.IDTruck,
                IDBox: alert.IDBox,
                IDDriver: driverMap[alert.IDDriver] || {}
            };

            if ('temperature' in alert) {
                formatted.temperature = alert.temperature;
            }
            if ('humidity' in alert) {
                formatted.humidity = alert.humidity;
            }

            return formatted;
        });

        formattedAlerts.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

        res.json({ alerts: formattedAlerts });
    } catch (error) {
        console.error('Error building alert list:', error);
        res.status(500).json({ error: 'Error retrieving enriched alerts' });
    }
});

router.get('/ForCargoType', async (req, res) => {
    try {
        const result = await Trip.aggregate([
            {
                $lookup: {
                    from: "cargoType",
                    localField: "IDCargoType",
                    foreignField: "_id",
                    as: "cargo"
                }
            },
            { $unwind: "$cargo" },
            {
                $group: {
                    _id: "$cargo.name",
                    totalTrips: { $sum: 1 }
                }
            }
        ]);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Error obteniendo viajes por tipo de carga' });
    }
});

router.get('/ForRute', async (req, res) => {
    try {
        const result = await Trip.aggregate([
            {
                $lookup: {
                    from: "rute",
                    localField: "IDRute",
                    foreignField: "_id",
                    as: "route"
                }
            },
            { $unwind: "$route" },
            {
                $group: {
                    _id: "$route.name",
                    totalTrips: { $sum: 1 }
                }
            },
            { $sort: { totalTrips: -1 } },
            {
                $project: {
                    _id: 0,
                    NombreDeLaRuta: "$_id",
                    totalDeViajes: "$totalTrips"
                }
            }
        ]);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Error obteniendo viajes por ruta' });
    }
});

router.get('/ForStatus', async (req, res) => {
    try {
        const result = await Trip.aggregate([
                {
                    $group: {
                        _id: "$status",
                        total: { $sum: 1 }
                    }
                }
        ]);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Error obteniendo viajes por status' });
    }
});

module.exports = router;