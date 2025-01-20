import JWT from "jsonwebtoken";
import User from "../model/userModel.js";

// Protect Route || Middleware for user and admin access
export const protectRoute = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      return res
        .status(401)
        .json({ message: "Unauthorized - No access token provided" });
    }

    // Determine the secret based on the URL
    const secret = req.originalUrl.includes("/admin")
      ? process.env.ADMIN_ACCESS_TOKEN_SECRET
      : process.env.USER_ACCESS_TOKEN_SECRET;

    let decoded;
    try {
      decoded = JWT.verify(accessToken, secret);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          message: "Access token expired. Please refresh the token.",
        });
      }
      return res
        .status(401)
        .json({ message: "Invalid token. Authorization denied." });
    }

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};


// Admin-Specific Access Middleware
export const adminRoute = (req, res, next) => {
  try {
    // Ensure req.user exists
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "Unauthorized - Please log in as an admin" });
    }

    // Check admin role
    if (req.user.role === "admin") {
      return next();
    }

    return res.status(403).json({ message: "Access denied - Admin only" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

