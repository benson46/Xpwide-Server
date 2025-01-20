import express from "express";
import {
  login,
  logout,
  refreshAccessToken,
  resendOtp,
  resetPassword,
  sendOtp,
  verifyResetOtp,
  verifySignUpOtp,
} from "../controller/userController.js";
import { getAllProducts, getProductDetails, getRelatedProducts } from "../controller/productController.js";

const userRouter = express.Router();

// ----------------------------------------------------
userRouter.post("/send-otp", sendOtp);
userRouter.post("/verify-signup-otp", verifySignUpOtp);
userRouter.post("/verify-reset-otp", verifyResetOtp);
userRouter.post("/resend-otp", resendOtp);
userRouter.post("/reset-password", resetPassword);
userRouter.post("/login", login);
userRouter.post("/logout", logout);
userRouter.get('/products', getAllProducts);
userRouter.get('/product', getProductDetails)
userRouter.get('/related-products',getRelatedProducts)
userRouter.get('/refresh-token',refreshAccessToken)
// ----------------------------------------------------

export default userRouter;
