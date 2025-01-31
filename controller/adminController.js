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

// Set access and refresh tokens in cookies
const setCookies = (res, adminAccessToken, adminRefreshToken) => {
  res.cookie("adminAccessToken", adminAccessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    maxAge: 15 * 60 * 1000, // Expiry time: 15 minutes
  });
  res.cookie("adminRefreshToken", adminRefreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // Expiry time: 7 days
  });
};

// --------------------------------------------------------------------------------------------------------

// METHOD POST || Login as admin
export const adminLogin = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: "Invalid Credintials." });
    }
    const match = await comparePassword(password, admin.password);
    if (match) {
      const adminData = {
        id: admin._id,
        role: admin.role,
      };
      const adminAccessToken = generateAccessToken(adminData);
      const adminRefreshToken = generateRefreshToken(adminData);

      await storeRefreshToken(admin._id, adminRefreshToken);
      setCookies(res, adminAccessToken, adminRefreshToken);

      res.status(200).json({
        admin: {
          _id: admin._id,
          email: admin.email,
          role: admin.role,
          adminAccessToken,
        },
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

// METHOD POST || Logout admin
export const adminLogout = async (req, res, next) => {
  try {
    const adminRefreshToken = req.cookies.adminRefreshToken;
    const adminId = req.body;

    if (adminRefreshToken) {
      await storeRefreshToken(adminId, null);
    }
    res.clearCookie("adminAccessToken");
    res.clearCookie("adminRefreshToken");
    res.json({ message: "Logged out successfully." });
  } catch (error) {
    next(error);
  }
};

// METHOD GET || Get users list
export const getUsersList = async (req, res, next) => {
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
    next(error);
  }
};

// METHOD PATCH || Block User
export const updateUserStatus = async (req, res, next) => {
  const { userId } = req.body;

  try {
    const userData = await User.findById(userId);
    if (!userData) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    const isCurrentlyBlocked = userData.isBlocked;
    if (isCurrentlyBlocked) {
      await deleteRefreshToken(userId);
    }

    const updatedUserData = await User.findByIdAndUpdate(
      userData._id,
      { $set: { isBlocked: !userData.isBlocked } },
      { new: true }
    );

    res.json({
      success: true,
      message: `User ${updatedUserData.isBlocked ? "blocked" : "unblocked"}`,
      updatedUserData,
    });
  } catch (error) {
    next(error);
  }
};

// METHDOD POST  || Refresh Access Token for admin
export const refreshAdminAccessToken = async (req, res, next) => {
  try {
    const { adminRefreshToken } = req.cookies;

    if (!adminRefreshToken) {
      return res.status(403).json({ message: "Refresh token is missing." });
    }

    const decode = await jwt.verify(
      adminRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const refreshTokenFromRedis = await getRefreshToken(decode.id);
    const cleanedRedisToken = refreshTokenFromRedis.replace(/^"|"$/g, ""); // Remove surrounding quotes

    if (!cleanedRedisToken || adminRefreshToken !== cleanedRedisToken) {
      return res.status(403).json({ message: "Invalid or mismatched token." });
    }

    const newAccessToken = generateAccessToken(decode);
    res.status(200).json({
      adminAccessToken: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------------------------------------------------------------

// METHOD POST || Signup as admin(devlopment mode only use)
/* export const adminSignup = async (req, res) => {
	const { email, password } = req.body;

	try {
		if (!email || !password) {
			return res
				.status(400)
				.json({ message: "Email and password are required." });
		}

		const existingAdmin = await Admin.findOne({ email });
		if (existingAdmin) {
			return res.status(409).json({ message: "Admin already exists." });
		}

		const hashedPassword = await hashPassword(password);
		const admin = await Admin.create({ email, password: hashedPassword });

    const accessToken = generateAccessToken(admin._id,admin.role)
		const  refreshToken = generateRefreshToken(admin._id,admin.role);
		await storeRefreshToken(admin._id, refreshToken);
		setCookies(res, accessToken, refreshToken);

		res.status(201).json({
			admin: { _id: admin._id, email: admin.email, role: admin.role },
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}; */
