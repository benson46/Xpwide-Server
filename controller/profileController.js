import User from "../model/userModel.js";

// --------------------------------------------------------------------------------------------------------

// Method Get || Get Profile Detials
export const getProfileDetials = async(req,res,next) => {
    // console.log(req.user)
    const userId = req.user.id
    console.log(userId)
    const userData = await User.findById(userId);
    res.status(200).json({
        success:true,
        userData
    })
}

// Method Post || Edit Profile Detials
export const editProfileDetials = async(req,res,next) => {
    const userId = req.user.id;
    const {firstName,lastName,email,phoneNumber} = req.body;

    const user = await User.findById(userId);

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.phoneNumber = phoneNumber || user.phoneNumber

    await user.save();
    res.json({success:true,user})

    console.log(user)
}
