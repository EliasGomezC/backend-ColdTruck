const User = require("../models/User")

module.exports = async (req, res, next) => {
  try {
    const userId = Number(req.user.id)
    const user = await User.findById(userId)
    if (!user) {
      return res.status(401).json({ msg: "User not found" })
    }
    if (user.status === "Unavailable") {
      return res.status(403).json({ msg: "User unavailable" })
    }
    if (user.status === "Disabled") {
      return res.status(403).json({ msg: "Account disabled" })
    }
    next()
  } catch (err) {
    res.status(500).json({ msg: "Server error" })
  }
}
