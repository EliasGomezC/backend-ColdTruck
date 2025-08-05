const jwt = require("jsonwebtoken")
const User = require("../models/User")

module.exports = async (req, res, next) => {
  const token = req.header("x-auth-token")

  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret")
    const user = await User.findById(Number(decoded.user.id))
    if (!user) {
      return res.status(401).json({ msg: "User not found" })
    }
    if (user.status === "Disabled") {
      return res.status(403).json({ msg: "Account disabled" })
    }
    req.user = { id: Number(user._id), role: user.role, status: user.status }
    next()
  } catch (err) {
    res.status(401).json({ msg: "Token is not valid" })
  }
}
