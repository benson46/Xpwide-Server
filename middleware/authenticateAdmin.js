import jwt from "jsonwebtoken";
import { getRefreshToken } from "../config/redis.js";
import { generateAccessToken } from "../utils/jwt/generateToken.js";

export const authenticateAdmin = async (req, res, next) => {
  try {
    const adminAccessToken = req.cookies?.adminAccessToken;
    const adminRefreshToken = req.cookies?.adminRefreshToken;

    if (!adminAccessToken) {
      return res.status(401).json({ message: "Access token is required." });
    }

    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds

    // Decode the token to check expiration time
    const decodedToken = jwt.decode(adminAccessToken);

    if (!decodedToken || !decodedToken.exp) {
      return res.status(401).json({ message: "Invalid access token." });
    }

    const timeToExpire = decodedToken.exp - currentTime;

    // Refresh the access token if it's about to expire (in 5 minutes or less)
    if (timeToExpire <= 300) {
      if (!adminRefreshToken) {
        return res.status(401).json({ message: "Refresh token is required." });
      }

      try {
        // Verify the refresh token
        const decodedRefresh = jwt.verify(
          adminRefreshToken,
          process.env.REFRESH_TOKEN_SECRET
        );

        // Verify refresh token with Redis
        const storedToken = (await getRefreshToken(decodedRefresh.id))?.replace(
          /^"|"$/g,
          ""
        );
        if (!storedToken || adminRefreshToken !== storedToken) {
          return res
            .status(403)
            .json({ message: "Invalid or mismatched refresh token." });
        }

        // Generate a new access token
        const newAccessToken = generateAccessToken(decodedRefresh);

        // Set the new access token in cookies
        res.cookie("adminAccessToken", newAccessToken, {
          httpOnly: true,
          secure: true, // Secure cookies in production
          sameSite: "None",
          maxAge: 15 * 60 * 1000, // 15 minutes
        });

        // Update the verified user
        req.user = decodedRefresh;
        return next();
      } catch (refreshError) {
        console.error("Error refreshing token:", refreshError);
        return res
          .status(401)
          .json({ message: "Unable to refresh access token." });
      }
    } else {
      // If the token is valid and not expiring soon, verify it normally
      const verified = jwt.verify(
        adminAccessToken,
        process.env.ACCESS_TOKEN_SECRET
      );

      if (verified.role !== "admin") {
        return res.status(401).json({ message: "Unauthorized access." });
      }

      req.user = verified;
      return next();
    }
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};
