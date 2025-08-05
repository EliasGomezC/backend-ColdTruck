const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const multer = require("multer")
const cloudinary = require("../config/cloudinary")
const User = require("../models/User")
const auth = require("../middleware/auth")
const restrictUnavailable = require("../middleware/restrictUnavailable")
const mongoose = require("mongoose")

const router = express.Router()

// Helper para mapear usuario Mongo/Mongoose a objeto plano con id (como número)
function toClient(user) {
  if (!user) return user
  const obj = user.toObject ? user.toObject() : { ...user }
  obj.id = Number(obj._id)
  delete obj._id
  return obj
}

const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed"), false)
    }
  },
})

// Helper para validar que un ID sea un número entero positivo
const isValidUserId = (id) => {
  const parsed = Number(id)
  return !isNaN(parsed) && parsed > 0
}

// Función helper para subir archivos a Cloudinary
const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: folder,
          resource_type: "auto",
          quality: "auto",
          fetch_format: "auto",
        },
        (error, result) => {
          if (error) {
            reject(error)
          } else {
            resolve(result)
          }
        },
      )
      .end(buffer)
  })
}

// --- REGISTRO (CON LOGIN AUTOMÁTICO) ---
router.post(
  "/register",
  upload.fields([
    { name: "license", maxCount: 1 },
    { name: "profilePicture", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        name,
        lastName,
        secondLastName,
        email,
        password,
        phoneNumber,
        role,
        status,
      } = req.body

      // Validate required files
      if (!req.files || !req.files.license || !req.files.profilePicture) {
        return res.status(400).json({ msg: "License and profile picture are required" })
      }

      if (!role || !["admin", "driver"].includes(role)) {
        return res.status(400).json({ msg: "Role must be either 'admin' or 'driver'" })
      }

      if (status && !["Available", "On Trip", "Unavailable", "Disabled"].includes(status)) {
        return res.status(400).json({ msg: "Invalid status value" })
      }

      // Check if user exists
      let user = await User.findOne({ email })
      if (user) {
        return res.status(400).json({ msg: "User already exists" })
      }

      // Create user object (id será autoasignado)
      user = new User({
        name,
        lastName,
        secondLastName,
        email,
        password,
        phoneNumber,
        role,
        status: status || "Available",
      })

      // Hash password
      const salt = await bcrypt.genSalt(10)
      user.password = await bcrypt.hash(password, salt)

      // Upload files to Cloudinary
      const licenseResult = await uploadToCloudinary(req.files.license[0].buffer, "licenses")
      user.license = licenseResult.secure_url

      const profileResult = await uploadToCloudinary(req.files.profilePicture[0].buffer, "profiles")
      user.profilePicture = profileResult.secure_url

      await user.save()

      // Crea JWT con id como Number
      const payload = {
        user: {
          id: Number(user._id),
          role: user.role,
        },
      }

      jwt.sign(payload, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "24h" }, (err, token) => {
        if (err) throw err
        res.json({
          token,
          user: toClient(user),
        })
      })
    } catch (err) {
      console.error("Error en registro:", err)
      res.status(500).json({ msg: "Server error during registration" })
    }
  }
)

// --- REGISTRO SIN LOGIN AUTOMÁTICO ---
router.post(
  "/register-only",
  upload.fields([
    { name: "license", maxCount: 1 },
    { name: "profilePicture", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        name,
        lastName,
        secondLastName,
        email,
        password,
        phoneNumber,
        role,
        status,
      } = req.body

      if (!req.files || !req.files.license || !req.files.profilePicture) {
        return res.status(400).json({ msg: "License and profile picture are required" })
      }
      if (!role || !["admin", "driver"].includes(role)) {
        return res.status(400).json({ msg: "Role must be either 'admin' or 'driver'" })
      }
      let user = await User.findOne({ email })
      if (user) {
        return res.status(400).json({ msg: "User already exists" })
      }

      user = new User({
        name,
        lastName,
        secondLastName,
        email,
        password,
        phoneNumber,
        role,
        status: status || "Available",
      })

      const salt = await bcrypt.genSalt(10)
      user.password = await bcrypt.hash(password, salt)
      const licenseResult = await uploadToCloudinary(req.files.license[0].buffer, "licenses")
      user.license = licenseResult.secure_url
      const profileResult = await uploadToCloudinary(req.files.profilePicture[0].buffer, "profiles")
      user.profilePicture = profileResult.secure_url

      await user.save()

      res.json({
        user: toClient(user),
      })
    } catch (err) {
      console.error("Error en registro sin login:", err)
      res.status(500).json({ msg: "Server error during registration" })
    }
  }
)

// --- LOGIN ---
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" })
    }
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" })
    }

    if (user.status === "Disabled") {
      return res.status(403).json({ msg: "Account disabled" })
    }

    const payload = {
      user: {
        id: Number(user._id),
        role: user.role,
      },
    }

    jwt.sign(payload, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "24h" }, (err, token) => {
      if (err) throw err
      res.json({
        token,
        user: toClient(user),
      })
    })
  } catch (err) {
    console.error(err)
    res.status(500).send("Server error")
  }
})

// --- PROFILE ---
router.get("/profile", auth, async (req, res) => {
  try {
    const userId = Number(req.user.id)
    if (isNaN(userId)) {
      return res.status(400).json({ msg: "ID inválido recibido en el token" })
    }
    const user = await User.findById(userId).select("-password")
    res.json(toClient(user))
  } catch (err) {
    console.error(err)
    res.status(500).send("Server error")
  }
})

// --- CHANGE PASSWORD ---
router.put("/change-password", auth, restrictUnavailable, async (req, res) => {
  try {
    const userId = Number(req.user.id)
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ msg: "Current and new password are required" })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ msg: "User not found" })
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) {
      return res.status(400).json({ msg: "Current password is incorrect" })
    }

    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(newPassword, salt)
    await user.save()

    res.json({ msg: "Password updated successfully" })
  } catch (err) {
    console.error(err)
    res.status(500).send("Server error")
  }
})

// --- GET ALL USERS (SOLO ADMIN) ---
router.get("/users", auth, async (req, res) => {
  try {
    const userId = Number(req.user.id)
    const currentUser = await User.findById(userId)
    if (!currentUser || currentUser.role !== "admin") {
      return res.status(403).json({ msg: "Access denied. Admin only." })
    }
    const users = await User.find().select("-password").sort({ registrationDate: -1 })
    res.json(users.map(toClient))
  } catch (err) {
    console.error(err)
    res.status(500).send("Server error")
  }
})

// --- UPDATE USER ---
router.put(
  "/users/:id",
  auth,
  restrictUnavailable,
  (req, res, next) => {
    if (!req.params.id || !isValidUserId(req.params.id)) {
      return res.status(400).json({
        msg: "Invalid user ID format",
        receivedId: req.params.id,
        receivedType: typeof req.params.id,
        expectedFormat: "Positive integer as string or number",
      })
    }
    next()
  },
  upload.fields([
    { name: "license", maxCount: 1 },
    { name: "profilePicture", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const adminId = Number(req.user.id)
      const currentUser = await User.findById(adminId)
      if (!currentUser) {
        return res.status(401).json({ msg: "User not authenticated" })
      }
      if (currentUser.role !== "admin") {
        return res.status(403).json({ msg: "Access denied. Admin only." })
      }

      const {
        name,
        lastName,
        secondLastName,
        email,
        phoneNumber,
        role,
        status,
      } = req.body
      const userId = Number(req.params.id)
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ msg: "User not found" })
      }

      if (
        status &&
        !["Available", "On Trip", "Unavailable", "Disabled"].includes(status)
      ) {
        return res.status(400).json({ msg: "Invalid status value" })
      }

      // Validar email único
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ email })
        if (existingUser && existingUser._id !== userId) {
          return res.status(400).json({ msg: "Email already exists" })
        }
      }

      if (name && name.trim()) user.name = name.trim()
      if (lastName && lastName.trim()) user.lastName = lastName.trim()
      if (secondLastName && secondLastName.trim()) user.secondLastName = secondLastName.trim()
      if (email && email.trim()) user.email = email.trim()
      if (phoneNumber && phoneNumber.trim()) user.phoneNumber = phoneNumber.trim()
      if (role && ["admin", "driver"].includes(role)) user.role = role
      if (
        status &&
        ["Available", "On Trip", "Unavailable", "Disabled"].includes(status)
      ) {
        user.status = status
      }

      if (req.files && Object.keys(req.files).length > 0) {
        if (req.files.license && req.files.license[0]) {
          try {
            const licenseResult = await uploadToCloudinary(req.files.license[0].buffer, "licenses")
            user.license = licenseResult.secure_url
          } catch (error) {
            return res.status(500).json({ msg: "Error uploading license", error: error.message })
          }
        }
        if (req.files.profilePicture && req.files.profilePicture[0]) {
          try {
            const profileResult = await uploadToCloudinary(req.files.profilePicture[0].buffer, "profiles")
            user.profilePicture = profileResult.secure_url
          } catch (error) {
            return res.status(500).json({ msg: "Error uploading profile picture", error: error.message })
          }
        }
      }

      await user.save()
      const updatedUser = await User.findById(userId).select("-password")
      res.json(toClient(updatedUser))
    } catch (err) {
      if (err.name === "ValidationError") {
        return res.status(400).json({
          msg: "Validation error",
          errors: Object.keys(err.errors).map((key) => ({
            field: key,
            message: err.errors[key].message,
          })),
        })
      }

      if (err.name === "CastError") {
        return res.status(400).json({ msg: "Invalid user ID format" })
      }

      if (err.code === 11000) {
        return res.status(400).json({ msg: "Duplicate field value" })
      }

      res.status(500).json({
        msg: "Server error during update",
        error: err.message,
        type: err.constructor.name,
      })
    }
  }
)

module.exports = router
