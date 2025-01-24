import express from "express";
import {
  login,
  logout,
  newAccessToken,
  resendOtp,
  resetPassword,
  sendOtp,
  verifyResetOtp,
  verifySignUpOtp,
  verifyUserStatus,
} from "../controller/userController.js";
import { getAllProducts, getCategoryProducts, getProductDetails, getRelatedProducts } from "../controller/productController.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { getAllCategories } from "../controller/categoryController.js";

const userRouter = express.Router();

// ----------------------------------------------------
userRouter.post("/send-otp", sendOtp);
userRouter.post("/verify-signup-otp", verifySignUpOtp);
userRouter.post("/verify-reset-otp", verifyResetOtp);
userRouter.post("/resend-otp", resendOtp);
userRouter.post("/reset-password", resetPassword);
userRouter.post("/login", login);
userRouter.post("/logout", logout);
// ----------------------------------------------------

userRouter.get('/category',getAllCategories)
// ----------------------------------------------------

userRouter.get('/products', getAllProducts);
userRouter.get('/product', getProductDetails)
userRouter.get('/related-products',getRelatedProducts)
userRouter.get('/products:/category',getCategoryProducts)

// ----------------------------------------------------
userRouter.get('/token',newAccessToken)
userRouter.get('/verify-user-status',verifyToken,verifyUserStatus)

export default userRouter;
