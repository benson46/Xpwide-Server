import { OAuth2Client } from "google-auth-library";
import User from "../model/userModel.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/jwt/generateToken.js";
import { storeRefreshToken } from "../config/redis.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); // Google client id

// Set cookies for tokens
const setCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

//--------------------------------------------------------------------------------------------------------

// METHOD POST || Login with google for user
export const login = async (req, res, next) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const {
      email,
      given_name: firstName,
      family_name: lastName,
      picture,
      sub: userId,
    } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        firstName,
        lastName,
        email,
        image: picture,
        password: "google-auth",
      });
    }

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

    const accessToken = generateAccessToken(userData);
    const refreshToken = generateRefreshToken(userData);

    await storeRefreshToken(user._id, refreshToken);

    setCookies(res, accessToken, refreshToken);

    res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      image: user.image,
      isBlocked: user.isBlocked,
      googleUser: true,
    });
  } catch (error) {
    next(error);
  }
};

//--------------------------------------------------------------------------------------------------------