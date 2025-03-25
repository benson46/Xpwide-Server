import jwt from "jsonwebtoken";
import { getRefreshToken } from "../config/redis.js";
import { generateAccessToken } from "../utils/jwt/generateToken.js";

export const authenticateUser = async (req, res, next) => {
  try {
    // Retrieve tokens from cookies
    const userAccessToken = req.cookies?.accessToken;
    const userRefreshToken = req.cookies?.refreshToken;

    if (!userAccessToken) {
      return res.status(401).json({ message: "Access token is required." });
    }

    // Calculate the current time in seconds
    const currentTime = Math.floor(Date.now() / 1000);

    // Decode the access token to extract the expiration time
    const decodedToken = jwt.decode(userAccessToken);
    if (!decodedToken || !decodedToken.exp) {
      return res.status(401).json({ message: "Invalid access token." });
    }

    const timeToExpire = decodedToken.exp - currentTime;

    // If token expires in 5 minutes or less, attempt to refresh it
    if (timeToExpire <= 300) {
      if (!userRefreshToken) {
        return res.status(401).json({ message: "Refresh token is required." });
      }

      try {
        // Verify the refresh token using the secret
        const decodedRefresh = jwt.verify(
          userRefreshToken,
          process.env.REFRESH_TOKEN_SECRET
        );

        // Check that the refresh token exists in Redis and matches
        const storedToken = (await getRefreshToken(decodedRefresh.id))?.replace(
          /^"|"$/g,
          ""
        );
        if (!storedToken || userRefreshToken !== storedToken) {
          return res
            .status(403)
            .json({ message: "Invalid or mismatched refresh token." });
        }

        // Generate a new access token using the refresh token's payload
        const newAccessToken = generateAccessToken(decodedRefresh);

        // Set the new access token in cookies with secure options
        res.cookie("userAccessToken", newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "None",
          maxAge: 15 * 60 * 1000, // 15 minutes
        });

        // Attach the decoded refresh token to the request object
        req.user = decodedRefresh;
        return next();
      } catch (refreshError) {
        console.error("Error refreshing token:", refreshError);
        return res
          .status(401)
          .json({ message: "Unable to refresh access token." });
      }
    } else {
      // Verify the access token normally if it is not near expiration
      const verified = jwt.verify(
        userAccessToken,
        process.env.ACCESS_TOKEN_SECRET
      );

      // Ensure the role is correct for a user (e.g., "user")
      if (verified.role !== "user") {
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
