import { OAuth2Client } from "google-auth-library";
import User from "../model/userModel.js";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const login = async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    const { email, given_name, family_name, picture } = payload;

    
    let user = await User.findOne({ email });

    if (!user) {
      
      user = await User.create({
        firstName: given_name,
        lastName: family_name,
        email,
        image: picture,
        password: "google-auth",
      });
    }

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    console.error("Google login error", error);
    res.status(500).json({ message: "Google login failed" });
  }
};
