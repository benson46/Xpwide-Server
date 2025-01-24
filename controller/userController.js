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
  refreshAccessToken,
} from "../utils/jwt/generateToken.js";

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

// Method Post || Sendotp
export const sendOtp = async (req, res, next) => {
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
    next(error);
  }
};

// Method Post || Verifyotp
export const verifySignUpOtp = async (req, res, next) => {
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
    next(error);
  }
};

export const verifyResetOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const currentOtp = await getOtp(email);

    if (!currentOtp) {
      return res.status(400).json({ message: "OTP has expired." });
    }

    if (+currentOtp !== +otp) {
      return res
        .status(403)
        .json({ message: "Invalid OTP. Please try again." });
    }

    res.json({
      status: "VERIFIED",
      message: "OTP verified successfully. Proceed to reset your password.",
    });
  } catch (error) {
    next(error);
  }
};

// Method Post || Resendotp
export const resendOtp = async (req, res, next) => {
  const { email } = req.body;
  try {
    if (!email) {
      throw new Error("Email is required.");
    }

    await OTP.findOneAndDelete({ email });

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

export const resetPasswordOtp = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  await OTP.findOneAndDelete({ email });

  const otp = generateOTP();

  await storeOtp(email, otp);
  sendVerificationMail(email, otp);
};

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

// Method Post || Login
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
    next(error);
  }
};

// Method Post || Logout
export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    const userId = req.body;
    if (refreshToken) {
      await storeRefreshToken(userId, null);
    }
    res.clearCookie("refreshToken");
    res.clearCookie("accessToken");
    res.json({ message: "Logged out successfully." });
  } catch (error) {
    next(error);
  }
};

export const refreshUserAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token is missing." });
    }

    // Verify the refresh token and extract the payload
    const decodedRefreshToken = jwt.verify(refreshToken, 'your_refresh_token_secret');
    
    // Verify the access token expiration
    const decodedAccessToken = jwt.decode(req.headers['authorization'].split(' ')[1]); // Extract token from header
    const currentTime = Math.floor(Date.now() / 1000); // Get current time in seconds
    if (decodedAccessToken.exp < currentTime) {
      return res.status(401).json({ message: "Access token has expired." });
    }

    // Generate a new access token using the refresh token
    const newAccessToken = await refreshAccessToken(refreshToken);

    return res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    console.error("Error refreshing access token:", error.message);
    return res.status(403).json({ message: "Invalid or expired refresh token." });
  }
};