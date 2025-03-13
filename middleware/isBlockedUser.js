import User from "../model/userModel.js";

export const isBlockedUser = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      console.error('User id not found')
      return res.status(400).json({ message: "User not found." });
    }

    const user = await User.findById({ _id:userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isBlocked) {
      res.clearCookie("refreshToken");
      res.clearCookie("accessToken");
      return res.status(403).json({ message: "User is blocked" });
    }

    next();
  } catch (error) {
    next(error);
  }
};
