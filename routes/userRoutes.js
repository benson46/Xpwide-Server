import express from "express";
import {
  forgetPasswordOtp,
  login,
  logout,
  refreshUserAccessToken,
  resendOtp,
  resetPassword,
  sendOtp,
  verifyOtp,
} from "../controller/userController.js";
import {
  getAllProducts,
  getProductDetails,
  getProducts,
  getRelatedProducts,
} from "../controller/productController.js";
import { getAllCategories } from "../controller/categoryController.js";
import { isBlockedUser } from "../middleware/isBlockedUser.js";
import { editProfileDetials, getProfileDetials } from "../controller/profileController.js";
import { authenticateUser } from "../middleware/authenticateUser.js";
import { addNewAddressDetails, deleteAddressDetails, getAddressDetails, updateAddressDetails } from "../controller/addressController.js";
import { addToCart, getCartProducts, removeFromCart, updateCartQuantity } from "../controller/cartController.js";

const userRouter = express.Router();

// ----------------------------------------------------

userRouter.post("/login", login);
userRouter.post("/send-otp", sendOtp);
userRouter.post("/forget-password-otp", forgetPasswordOtp);
userRouter.post("/verify-otp", verifyOtp);
userRouter.post("/resend-otp", resendOtp);
userRouter.post("/reset-password", resetPassword);
userRouter.post("/logout", logout);

// ----------------------------------------------------

userRouter.get("/category", isBlockedUser, getAllCategories);

// ----------------------------------------------------
userRouter.get('/all-products',isBlockedUser,getAllProducts)
userRouter.get("/product", isBlockedUser, getProductDetails);
userRouter.get("/products", isBlockedUser, getProducts);
userRouter.get("/related-products", isBlockedUser, getRelatedProducts);

// ----------------------------------------------------

userRouter
  .route("/profile")
  .get(authenticateUser,isBlockedUser, getProfileDetials)
  .put(authenticateUser,isBlockedUser, editProfileDetials);
// ----------------------------------------------------

userRouter
  .route("/address")
  .get(authenticateUser, isBlockedUser, getAddressDetails)
  .post(authenticateUser, isBlockedUser, addNewAddressDetails)

userRouter.put(
  "/address/:id",
  authenticateUser,
  isBlockedUser,
  updateAddressDetails 
);
userRouter.delete(
  "/address/:id",
  authenticateUser,
  isBlockedUser,
  updateAddressDetails 
);

// ----------------------------------------------------

userRouter.route("/cart")
.get(authenticateUser,isBlockedUser,getCartProducts)
.post(authenticateUser,isBlockedUser,addToCart)
.patch(authenticateUser,isBlockedUser,updateCartQuantity)
.delete(authenticateUser,isBlockedUser,removeFromCart)

// ----------------------------------------------------


userRouter.post("/refresh-token", refreshUserAccessToken);
export default userRouter;


