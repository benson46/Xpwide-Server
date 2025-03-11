import crypto from "crypto";
import mongoose from "mongoose";

// Schema for User
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
    },
    lastName: {
      type: String,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password should be at least 6 characters long"],
    },
    image: {
      type: String,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      default: "user",
    },
    uniqueReferralCode: {
      type: String,
      default: generateReferralCode,
      required: true,
      unique: true,
    },
    referrals: {
      type: Number,
      default: 0, // Number of successful referrals
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", 
      default: null,
    },
  },
  { timestamps: true }
);

// Function to generate a unique referral code
function generateReferralCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase(); // Generate a random string of 8 alphanumeric characters
}

const User = mongoose.model("User", userSchema);
export default User;
