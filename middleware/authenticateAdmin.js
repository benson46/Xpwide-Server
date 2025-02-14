import jwt from "jsonwebtoken";
import { getRefreshToken } from "../config/redis.js";
import { generateAccessToken } from "../utils/jwt/generateToken.js";

export const authenticateAdmin = async (req, res, next) => {
  try {
    const adminAccessToken = req.cookies?.adminAccessToken;
    const adminRefreshToken = req.cookies?.adminRefreshToken;

    if (!adminAccessToken) {
      return res.status(401).json({ message: "Access token is required" });
    }

    // Decode the token (without verifying) to check the expiration time
    const decodedToken = jwt.decode(adminAccessToken);
    if (!decodedToken || !decodedToken.exp) {
      return res.status(401).json({ message: "Invalid access token" });
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const timeToExpire = decodedToken.exp - currentTime;

    // If the token is going to expire in 5 minutes (300 seconds) or less, refresh it
    if (timeToExpire <= 300) {
      if (!adminRefreshToken) {
        return res.status(401).json({ message: "Refresh token is required" });
      }

      try {
        const decodedRefresh = jwt.verify(adminRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        const storedToken = (await getRefreshToken(decodedRefresh.id)).replace(/^"|"$/g, "");
        if (!storedToken || adminRefreshToken !== storedToken) {
          return res.status(403).json({ message: "Invalid or mismatched refresh token." });
        }
        const newAccessToken = generateAccessToken(decodedRefresh);

        res.cookie("adminAccessToken", newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production", // use secure cookies in production
          sameSite: "Strict",
        });

        const verified = jwt.verify(newAccessToken, process.env.ACCESS_TOKEN_SECRET);
        if (verified.role !== "admin") {
          return res.status(401).json({ message: "Invalid token" });
        }
        req.user = verified;
        return next();
      } catch (refreshError) {
        console.error("Error refreshing token:", refreshError);
        return res.status(401).json({ message: "Unable to refresh access token" });
      }
    } else {
      // If the token has more than 5 minutes to expire, verify it normally
      const verified = jwt.verify(adminAccessToken, process.env.ACCESS_TOKEN_SECRET);
      if (verified.role !== "admin") {
        return res.status(401).json({ message: "Invalid token" });
      }
      req.user = verified;
      return next();
    }
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};



// import jwt from "jsonwebtoken";
// export const authenticateAdmin = async (req, res, next) => {
//   const authHead = req.headers["authorization"];
//   const token = authHead && authHead.split(" ")[1];

//   console.log(token);
//   if (!token) {
//     return res.status(401).json({ message: "AccessToken Required" });
//   }

//   try {
//     const decode = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
//     if (decode.role !== "admin") {
//       console.log(decode.role);
//       return res.status(401).json({ message: "Invalid Token" });
//     }

//     req.user = decode;
//     next();
//   } catch (error) {
//     return res.status(401).json({ message: "Invalid or Expired Token" });
//   }
// };