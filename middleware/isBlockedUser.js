import User from "../model/userModel.js";

export const isBlockedUser = async (req, res, next) => {
    try {
      const email = req.body.email || req.headers['user-email'] || req.query.email;
      console.log('Email:', email);

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
  
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      if (user.isBlocked) {
        res.clearCookie("refreshToken")
        res.clearCookie("accessToken");
        return res.status(403).json({ message: 'User is blocked' });
      }
  
      next();
    } catch (error) {
        next(error)
    }
  };
  