import { OAuth2Client } from "google-auth-library";
import User from "../model/userModel.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/jwt/generateToken.js";
import { storeRefreshToken } from "../config/redis.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Set cookies for tokens
const setCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// Login handler
export const login = async (req, res) => {
  try {
    const { token } = req.body;

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, given_name: firstName, family_name: lastName, picture, sub: userId } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (!user) {
      // Create a new user if not found
      user = await User.create({
        firstName,
        lastName,
        email,
        image: picture,
        password:'google-auth'
      });
    }

    // Check if the user is blocked
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "You are blocked. Not able to login.",
      });
    }

    const userData = {
      id: user._id,
      role: "user",
    };

    // Generate tokens
    const accessToken = generateAccessToken(userData);
    const refreshToken = generateRefreshToken(userData);

    await storeRefreshToken(user._id, refreshToken);

    // Set cookies for the tokens
    setCookies(res, accessToken, refreshToken);

    // Send the response
    res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        image: user.image,
        isBlocked: user.isBlocked
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({ success: false, message: "Google login failed" });
  }
};
