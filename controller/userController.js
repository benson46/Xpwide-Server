import { comparePassword, hashPassword } from "../utils/secure/password.js";
import User from "../model/userModel.js";
import { generateOTP } from "../utils/otp/generateOtp.js";
import sendVerificationMail from "../utils/nodeMailer/sendVerificationMail.js";
import {
  getData,
  getOtp,
  storeData,
  storeOtp,
  storeRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
} from "../config/redis.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/jwt/generateToken.js";
import jwt from "jsonwebtoken";
// _______________________________________________________________________//

// =============================== HELPER FUNCTION ===============================
// Set access and refresh tokens in cookies
const setCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    maxAge: 15 * 60 * 1000, // Expiry time: 15 minutes
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // Expiry time: 7 days
  });
};

// =============================== USER CONTROLLERS ===============================
// METHOD POST || Login as user
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    // Validate input fields
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "Email not registered.",
      });
    }

    const match = await comparePassword(password, user.password);
    if (match) {
      if (user.isBlocked) {
        return res.status(401).json({ message: "User is blocked by admin" });
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
        _id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        isBlocked: user.isBlocked,
        accessToken,
      });
    } else {
      return res.status(404).json({
        message: "Invalid Credintials.",
      });
    }
  } catch (error) {
    next(error);
  }
};

// METHOD POST || Send OTP
export const sendOtp = async (req, res, next) => {
  const { formData } = req.body;

  if (
    !formData.firstName ||
    !formData.lastName ||
    !formData.email ||
    !formData.phoneNumber ||
    !formData.password
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const existUser = await User.findOne({ email: formData.email });
  if (existUser) {
    return res.status(400).json({ message: "User already exists." });
  }
  try {
    formData.password = await hashPassword(formData.password);
    await storeData(formData.email, formData, 1000);

    const otp = generateOTP();
    await storeOtp(formData.email, otp);
    sendVerificationMail(formData.email, otp);
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    next(error);
  }
};

// METHOD POST || Forget Password OTP send
export const forgetPasswordOtp = async (req, res, next) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = generateOTP();

    await storeOtp(email, otp);
    sendVerificationMail(email, otp);

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    next(error);
  }
};

// METHOD POST || Resend OTP
export const resendOTP = async (req, res, next) => {
  const { email } = req.body;
  try {
    if (!email) {
      throw new Error("Email is required.");
    }

    const otp = generateOTP();

    await storeOtp(email, otp);
    sendVerificationMail(email, otp);

    res.status(200).json({
      status: "SUCCESS",
      message: "OTP has been resent successfully. Please check your inbox.",
    });
  } catch (error) {
    next(error);
  }
};

// METHOD POST || Verify entered OTP
export const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new Error("Empty OTP details are not allowed");
    }

    const currentOtp = await getOtp(email);
    if (!currentOtp) {
      return res.status(400).json({ message: "OTP expired" });
    }
    if (+currentOtp !== +otp) {
      return res.status(400).json({ message: "OTP mismatching" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      // If user exists, redirect to reset password flow
      return res.json({
        status: "VERIFIED",
        message: "OTP verified. Proceed to reset password.",
      });
    } else {
      // If user does not exist, create a new user
      const userData = await getData(email);
      if (!userData) {
        return res.status(400).json({ message: "User data not found" });
      }

      const user = new User({ ...userData });
      await user.save();

      return res.json({
        status: "VERIFIED",
        message: "User email verified successfully, account created.",
      });
    }
  } catch (error) {
    next(error);
  }
};

// METHOD POST || Reset Password
export const resetPassword = async (req, res, next) => {
  try {
    const { password, email } = req.body;

    if (!password || !email) {
      return res
        .status(400)
        .json({ message: "Password and Email are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const hashedPassword = await hashPassword(password);

    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password reset successfully." });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword, email } = req.body;

    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const match = await comparePassword(oldPassword, user.password);
    if (!match) {
      return res.status(401).json({ message: "Old password not matching" });
    }

    const hashedPassword = await hashPassword(newPassword);

    user.password = hashedPassword;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    next(error);
  }
};

// METHOD POST || Logout
export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    const userId = JSON.stringify(req.body.userId);
    if (refreshToken) {
      await deleteRefreshToken(userId);
    }
    res.clearCookie("refreshToken");
    res.clearCookie("accessToken");
    res.json({ message: "Logged out successfully." });
  } catch (error) {
    next(error);
  }
};

export const getUserSpecificInfo = async (req, res,next) => {
  try {
    const userData = await User.findById(req.user.id);
  
    res.json({ success: true, userData });
  } catch (error) {
    next(error)
  }
};

// Method Post || Refresh Access Token
export const refreshUserAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(403).json({ message: "Refresh token is missing." });
    }

    const decode = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const refreshTokenFromRedis = await getRefreshToken(decode.id);
    const cleanedRedisToken = refreshTokenFromRedis.replace(/^"|"$/g, "");

    if (!cleanedRedisToken || refreshToken !== cleanedRedisToken) {
      return res.status(403).json({ message: "Invalid or mismatched token." });
    }

    const newAccessToken = generateAccessToken(decode);
    res.status(200).json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
};
