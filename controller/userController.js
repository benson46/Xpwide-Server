import { comparePassword, hashPassword } from "../utils/secure/password.js";
import User from "../model/userModel.js";
import OTP from "../model/otpModel.js";
import { generateOTP } from "../utils/otp/generateOtp.js";
import sendVerificationMail from "../utils/nodeMailer/sendVerificationMail.js";
import {
  getData,
  getOtp,
  storeData,
  storeOtp,
  storeRefreshToken,
} from "../config/redis.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/jwt/generateToken.js"; 
import { JWT } from "google-auth-library";

// Set access and refresh tokens in cookies
const setCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true, // Prevent XSS attacks
    secure: process.env.NODE_ENV === "production",
    sameSite: "None", // Prevent CSRF attacks
    maxAge: 15 * 60 * 1000, // Expiry time: 15 minutes
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true, // Prevent XSS attacks
    secure: process.env.NODE_ENV === "production",
    sameSite: "None", // Prevent CSRF attacks
    maxAge: 7 * 24 * 60 * 60 * 1000, // Expiry time: 7 days
  });
};

// Method Post || Sendotp
export const sendOtp = async (req, res) => {
  const { formData } = req.body;

  if (
    !formData.firstName ||
    !formData.lastName ||
    !formData.email ||
    !formData.phoneNumber ||
    !formData.password
  ) {
    return res.status(400).json({ message: "All field required" });
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
    res.status(200).json({ message: "OTP send successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Method Post || Verifyotp
export const verifySignUpOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const existUser = await User.findOne({ email });
    if (existUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    // Validate input
    if (!email || !otp) {
      throw new Error("Empty OTP details are not allowed");
    }
    const currentOtp = await getOtp(email);

    if (!currentOtp) {
      return res.status(400).json({ message: "otp expired" });
    }
    if (+currentOtp != +otp) {
      return res.status(403).json({ message: "otp mismatching" });
    }

    const userData = await getData(email);
    const user = new User({ ...userData });
    await user.save();

    res.json({
      status: "VERIFIED",
      message: "User email verified successfully",
    });
  } catch (error) {
    res.status(400).json({
      status: "FAILED",
      message: error.message,
    });
  }
};

export const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;


    // Validate input
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    // Check if the user exists
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // Fetch OTP from database or cache
    const currentOtp = await getOtp(email); // Replace with your OTP retrieval logic

    if (!currentOtp) {
      return res.status(400).json({ message: "OTP has expired." });
    }

    // Validate the OTP
    if (+currentOtp !== +otp) {
      return res
        .status(403)
        .json({ message: "Invalid OTP. Please try again." });
    }

    // OTP validation successful
    res.json({
      status: "VERIFIED",
      message: "OTP verified successfully. Proceed to reset your password.",
    });
  } catch (error) {
    // Handle unexpected errors
    console.error("Error verifying reset OTP:", error.message);
    res.status(500).json({
      status: "FAILED",
      message:
        "An error occurred during OTP verification. Please try again later.",
    });
  }
};

// Method Post || Resendotp
export const resendOtp = async (req, res) => {
  const { email } = req.body;
  try {

    if (!email) {
      throw new Error("Email is required.");
    }

    // Delete any existing OTPs for the email
    await OTP.findOneAndDelete({ email });

    // Generate a new OTP and send it
    const otp = generateOTP();

    await storeOtp(email, otp);
    sendVerificationMail(email, otp);

    res.status(200).json({
      status: "SUCCESS",
      message: "OTP has been resent successfully. Please check your inbox.",
    });
  } catch (error) {
    res.status(500).json({
      status: "FAILED",
      message: error.message,
    });
  }
};

export const resetPasswordOtp = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  await OTP.findOneAndDelete({ email });

  // Generate a new OTP and send it
  const otp = generateOTP();

  await storeOtp(email, otp);
  sendVerificationMail(email, otp);
};

export const resetPassword = async (req, res) => {
  try {
    const { password, email } = req.body;

    // Validate input
    if (!password || !email) {
      return res
        .status(400)
        .json({ message: "Password and Email are required." });
    }

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }


    // Hash the new password
    const hashedPassword = await hashPassword(password);

    // Update the user's password
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("Error resetting password:", error);
    res
      .status(500)
      .json({ message: "An error occurred. Please try again later." });
  }
};
// Method Post || Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input fields
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "Email not registered.",
      });
    }

    // Verify password
    const match = await comparePassword(password, user.password);

    if (match) {
      if (user.isBlocked) {
        return res.status(403).json({ message: "User is blocked by admin" });
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
      return res.status(401).json({
        message: "Invalid password.",
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error logging in.",
      error: error.message,
    });
  }
};

// Method Post || Logout
export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    const userId = req.body;
    if (refreshToken) {
      await storeRefreshToken(userId, null);
    }
    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const newAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token missing" });
    }

    const storedRefreshToken = await storeRefreshToken(userId, null);

    if(!storedRefreshToken){
      return res.status(403).json({mesage:"Invalid refresh token"})
    }

    if (storeRefreshToken.expiresAt <= new Date()) {
      await redis.del(`refresh_token:${decoded.userId}`);
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return res
        .status(403)
        .json({ message: "Refresh token expired, please log in again." });
    }


    const user = JWT.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET)

    const userData = {id:user._id,role:user.role};


    const newAccessToken = generateAccessToken(userData);
    
    setCookies(res, newAccessToken);

    res.status(200).json({
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("Refresh token error", error);
    res.status(500).json({ message: "Failed to refresh token" });
  }
};

