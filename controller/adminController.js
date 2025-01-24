import { hashPassword, comparePassword } from "../utils/secure/password.js";
import Admin from "../model/adminModel.js";
import User from "../model/userModel.js";
import { deleteRefreshToken, storeRefreshToken } from "../config/redis.js";
import { convertDateToMonthAndYear } from "../config/dateConvertion.js";
import {
  generateAccessToken,
  generateRefreshToken,
  refreshAccessToken,
} from "../utils/jwt/generateToken.js";

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

//     const accessToken = generateAccessToken(admin._id,admin.role)
// 		const  refreshToken = generateRefreshToken(admin._id,admin.role);
// 		await storeRefreshToken(admin._id, refreshToken);
// 		setCookies(res, accessToken, refreshToken);

// 		res.status(201).json({
// 			admin: { _id: admin._id, email: admin.email, role: admin.role },
// 		});
// 	} catch (error) {
// 		res.status(500).json({ message: error.message });
// 	}
// };

// Method Post || Admin Login

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
      const accessToken = generateAccessToken(adminData);
      const refreshToken = generateRefreshToken(adminData);

      await storeRefreshToken(admin._id, refreshToken);
      setCookies(res, accessToken, refreshToken);

      res.status(200).json({
        admin: {
          _id: admin._id,
          email: admin.email,
          role: admin.role,
          accessToken,
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

// Method Post || Admin Logout
export const adminLogout = async (req, res, next) => {
  try {
    const adminRefreshToken = req.cookies.adminRefreshToken;

    if (adminRefreshToken) {
      await storeRefreshToken(adminId, null);
    }
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully." });
  } catch (error) {
    next(error);
  }
};

// Method Get || Get users list
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

// Method Patch || Block User
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
    if(isCurrentlyBlocked){
      await deleteRefreshToken(userId)
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



// Method Post || Refresh Access Token
export const refreshAdminAccessToken = async (req, res, next) => {
  try {
    const { adminRefreshToken } = req.cookies;
    
    if (!adminRefreshToken) {
      return res.status(401).json({ message: "Refresh token is missing." });
    }

    const newAccessToken = refreshAccessToken(adminRefreshToken);

    res.status(200).json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
};