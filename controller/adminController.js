import { hashPassword, comparePassword } from "../utils/secure/password.js";
import Admin from "../model/adminModel.js";
import User from "../model/userModel.js";
import { deleteRefreshToken, storeRefreshToken } from "../config/redis.js";
import { convertDateToMonthAndYear } from "../config/dateConvertion.js";
import {
  adminDecodeAccessToken,
  adminDecodeRefreshToken,
  adminGenerateAccessToken,
  adminGenerateRefreshToken,
} from "../utils/jwt/adminJwt.js";

// Set access and refresh tokens in cookies
const setCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000, // Expiry time: 15 minutes
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // Expiry time: 7 days
  });
};

// Method Post || Admin Login
export const adminLogin = async (req, res) => {
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
      const accessToken = adminGenerateAccessToken(admin._id);
      const refreshToken = adminGenerateRefreshToken(admin._id);

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
    res.status(500).json({ message: error.message });
  }
};

// Method Post || Admin Logout
export const adminLogout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      const decoded = adminDecodeRefreshToken(refreshToken);
      const adminId = decoded;
      await deleteRefreshToken(adminId);
    }

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Method Get || Get users list
export const getUsersList = async (req, res) => {
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
    res
      .status(500)
      .json({ message: "Error fetching user list", error: error.message });
  }
};

// Method Patch || Block User
export const updateUserStatus = async (req, res) => {
  const { userId } = req.body;

  try {
    const userData = await User.findById(userId);

    if (!userData) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    const updatedUserData = await User.findByIdAndUpdate(
      userId,
      { $set: { isBlocked: !userData.isBlocked } },
      { new: true }
    );

    if (updatedUserData.isBlocked) {
      await storeRefreshToken(updatedUserData._id, null);
    }

    res.status(200).json({
      success: true,
      message: `User status updated to ${
        updatedUserData.is_blocked ? "blocked" : "active"
      }`,
      updatedUserData,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Refresh Token
// export const adminRefreshAccessToken = async (req, res) => {
//   try {
//     const refreshToken = req.cookies.refreshToken;

//     if (!refreshToken) {
//       return res.status(401).json({ message: "No refresh token provided." });
//     }

//     const decoded = adminDecodeAccessToken(refreshToken);

//     const storedToken = await redis.get(
//       `admin_refresh_token:${decoded.adminId}`
//     );

//     if (storedToken !== refreshToken) {
//       return res.status(401).json({ message: "Invalid refresh token." });
//     }

//     const accessToken = adminDecodeAccessToken(decoded.adminId);

//     res.cookie("accessToken", accessToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "strict",
//       maxAge: 15 * 60 * 1000, // Expiry time: 15 minutes
//     });

//     res.json({ message: "Token refreshed successfully." });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };


// Admin Signup
// export const adminSignup = async (req, res) => {
// 	const { email, password } = req.body;

// 	try {
// 		if (!email || !password) {
// 			return res
// 				.status(400)
// 				.json({ message: "Email and password are required." });
// 		}

// 		const existingAdmin = await Admin.findOne({ email });
// 		if (existingAdmin) {
// 			return res.status(409).json({ message: "Admin already exists." });
// 		}

// 		const hashedPassword = await hashPassword(password);
// 		const admin = await Admin.create({ email, password: hashedPassword });

// 		const { accessToken, refreshToken } = generateTokens(admin._id);
// 		await storeRefreshToken(admin._id, refreshToken);
// 		setCookies(res, accessToken, refreshToken);

// 		res.status(201).json({
// 			admin: { _id: admin._id, email: admin.email, role: admin.role },
// 		});
// 	} catch (error) {
// 		res.status(500).json({ message: error.message });
// 	}
// };
