import { hashPassword, comparePassword } from "../utils/secure/password.js";
import Admin from "../model/adminModel.js";
import User from "../model/userModel.js";
import mongoose from "mongoose";
import { deleteRefreshToken, storeRefreshToken } from "../config/redis.js";
import { convertDateToMonthAndYear } from "../config/dateConvertion.js";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt/generateToken.js";

// Set access and refresh tokens in cookies
const setCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "None",
    maxAge: 15 * 60 * 1000, // Expiry time: 15 minutes
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "None",
    maxAge: 7 * 24 * 60 * 60 * 1000, // Expiry time: 7 days
  });
};

// Method Post || Admin Login
export const adminLogin = async (req, res,next) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }
    const match = await comparePassword(password, admin.password);
    if (match) {
      const adminData = {
        id:admin._id,
        role:admin.role,
      }
      const accessToken = generateAccessToken(adminData);
      const refreshToken = generateRefreshToken(adminData);


      await storeRefreshToken(admin._id, refreshToken);
      setCookies(res, accessToken, refreshToken);

      res.status(200).json({
        admin: { _id: admin._id, email: admin.email, role: admin.role },
      });
    } else {
      return res.status(401).json({
        message: "Invalid password.",
      });
    }
  } catch (error) {
    next(error)
  }
};

// Method Post || Admin Logout
export const adminLogout = async (req, res,next) => {
  try {
    const adminRefreshToken = req.cookies.adminRefreshToken;

    if(adminRefreshToken){
      await storeRefreshToken(adminId, null); 
    }

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully." });
  } catch (error) {
    next(error)
  }
};

// Method Get || Get users list
export const getUsersList = async (req, res,next) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  try {
    const totalUsersCount = await User.countDocuments({});

    const totalPages = Math.ceil(totalUsersCount / limit);

    const usersList = await User.find({}, { password: false })
      .skip(skip)
      .limit(limit)
      .lean(); // Returns plain JavaScript objects instead of Mongoose documents

    for (const user of usersList) {
      user.createdAt = convertDateToMonthAndYear(user.createdAt);
    }

    res.status(200).json({
      success: true,
      page,
      totalPages,
      users: usersList,
    });
  } catch (error) {
    next(error)
  }
};

// Method Patch || Block User
export const updateUserStatus = async (req, res,next) => {
  const { userId } = req.body;
  console.log(userId)
   
  try {
    const userData = await User.findById(userId);
    if (!userData) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    const isCurrentlyBlocked = userData.isBlocked;

    const updatedUserData = await User.findByIdAndUpdate(
      userData._id,
      { $set: { isBlocked: !userData.isBlocked } },
      { new: true }
    );

    console.log(updatedUserData)

    res.json({
      success: true,
      message: `User ${updatedUserData.isBlocked ? "blocked" : "unblocked"}`,
      updatedUserData,
    });

  } catch (error) {
   next(error)
  }
};


export const checkUserStatus = async (req, res , next) => {
  const userId = req.query.userId;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid or missing userId" });
  }

  try {
    const user = await User.findById(userId); 

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "User is blocked" });
    }

    return res.status(200).json({ message: "User is active" });
  } catch (error) {
    next(error)
  }
};

