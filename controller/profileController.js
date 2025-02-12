import User from "../model/userModel.js";
// _______________________________________________________________________//

// =============================== USER CONTROLLERS ===============================
// METHOD GET || Show profile detials
export const getProfileDetials = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userData = await User.findById(userId);
    res.status(200).json({
      success: true,
      userData,
    });
  } catch (error) {
    next(error);
  }
};

// METHOD POST || Edit Profile Detials
export const editProfileDetials = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, email, phoneNumber } = req.body;

    const user = await User.findById(userId);

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.phoneNumber = phoneNumber || user.phoneNumber;

    await user.save();
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};
// _______________________________________________________________________//