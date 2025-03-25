import { comparePassword } from "../utils/secure/password.js";
import Admin from "../model/adminModel.js";
import User from "../model/userModel.js";
import {
  deleteRefreshToken,
  getRefreshToken,
  storeRefreshToken,
} from "../config/redis.js";
import { convertDateToMonthAndYear } from "../config/dateConvertion.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/jwt/generateToken.js";
import jwt from "jsonwebtoken";
// _______________________________________________________________________//

// =============================== HELPER FUNCTION ===============================
//Set access and refresh tokens in cookies
const setCookies = (res, adminAccessToken, adminRefreshToken) => {
  res.cookie("adminAccessToken", adminAccessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie("adminRefreshToken", adminRefreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// =============================== ADMIN CONTROLLERS ===============================
// METHOD POST || ADMIN LOGIN
export const adminLogin = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }
    const admin = await Admin.findOne({ email });
    if (!admin || !(await comparePassword(password, admin.password))) {
      return res.status(404).json({ message: "Invalid Credentials." });
    }
    const adminData = { id: admin._id, role: admin.role };
    const adminAccessToken = generateAccessToken(adminData);
    const adminRefreshToken = generateRefreshToken(adminData);
    await storeRefreshToken(admin._id, adminRefreshToken);
    setCookies(res, adminAccessToken, adminRefreshToken);
    res.status(200).json({
      success:true,
      admin: {
        _id: admin._id,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// METHOD POST || ADMIN LOGOUT
export const adminLogout = async (req, res, next) => {
  try {
    const { adminRefreshToken } = req.cookies;
    const { adminId } = req.body;
    if (adminRefreshToken) {
      await storeRefreshToken(adminId, null);
    }
    res.clearCookie("adminAccessToken", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });
    res.clearCookie("adminRefreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });
    res.status(200).json({ success:true,message: "Logged out successfully." });
  } catch (error) {
    next(error);
  }
};

// METHOD GET || FETCH USERS LIST
export const getUsersList = async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  try {
    const totalUsersCount = await User.countDocuments({});
    const usersList = await User.find({}, { password: false })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    usersList.forEach((user) => {
      user.createdAt = convertDateToMonthAndYear(user.createdAt);
    });
    res.status(200).json({ success: true, users: usersList,total:totalUsersCount });
  } catch (error) {
    next(error);
  }
};

// METHOD PATCH || BLOCK/UNBLOCK USER
export const updateUserStatus = async (req, res, next) => {
  const { userId } = req.body;
  try {
    const userData = await User.findById(userId);
    if (!userData) {
      return res.status(400).json({ success: false, message: "User not found." });
    }
    if (userData.isBlocked) {
      await deleteRefreshToken(userId);
    }
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { isBlocked: !userData.isBlocked } },
      { new: true }
    );
    res.status(200).json({
      success: true,
      message: `User ${updatedUser.isBlocked ? "blocked" : "unblocked"}`,
      updatedUser,
    });
  } catch (error) {
    next(error);
  }
};


// =============================== DEVELOPMENT USED FUNCTION ===============================

// METHOD POST || Signup as admin (Development mode only)
/* export const adminSignup = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(409).json({ message: "Admin already exists." });
    }
    const hashedPassword = await hashPassword(password);
    const admin = await Admin.create({ email, password: hashedPassword });
    const accessToken = generateAccessToken(admin._id, admin.role);
    const refreshToken = generateRefreshToken(admin._id, admin.role);
    await storeRefreshToken(admin._id, refreshToken);
    setCookies(res, accessToken, refreshToken);
    res.status(201).json({
      admin: { _id: admin._id, email: admin.email, role: admin.role },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; */
