import express from "express";
import {
  changePassword,
  forgetPasswordOtp,
  login,
  logout,
  refreshUserAccessToken,
  resendOTP,
  resetPassword,
  sendOtp,
  verifyOTP,
} from "../controller/userController.js";
import {
  getAllProducts,
  getFeaturedProducts,
  getProductDetails,
  getProducts,
  getRelatedProducts,
} from "../controller/productController.js";
import { getAllCategories } from "../controller/categoryController.js";
import { isBlockedUser } from "../middleware/isBlockedUser.js";
import {
  editProfileDetials,
  getProfileDetials,
} from "../controller/profileController.js";
import { authenticateUser } from "../middleware/authenticateUser.js";
import {
  addNewAddressDetails,
  deleteAddressDetails,
  getAddressDetails,
  updateAddressDetails,
} from "../controller/addressController.js";
import {
  addToCart,
  getCartProducts,
  removeFromCart,
  updateCartQuantity,
} from "../controller/cartController.js";
import { getCartItems } from "../controller/checkoutController.js";
import { orderSuccess } from "../controller/orderController.js";

const userRouter = express.Router();

// ----------------------------------------------------

userRouter.post("/login", login);
userRouter.post("/send-otp", sendOtp);
userRouter.post("/forget-password-otp", forgetPasswordOtp);
userRouter.post("/resend-otp", resendOTP);
userRouter.post("/verify-otp", verifyOTP);
userRouter.post("/reset-password", resetPassword);
userRouter.post("/logout", logout);

// ----------------------------------------------------

userRouter.get("/category", isBlockedUser, getAllCategories);

// ----------------------------------------------------
userRouter.get("/product", isBlockedUser, getProductDetails);
userRouter.get("/products", isBlockedUser, getProducts);
userRouter.get('/featured-products',isBlockedUser,getFeaturedProducts)
userRouter.get("/related-products", isBlockedUser, getRelatedProducts);

// ----------------------------------------------------

userRouter
  .route("/profile")
  .get(authenticateUser, isBlockedUser, getProfileDetials)
  .put(authenticateUser, isBlockedUser, editProfileDetials);

userRouter.post('/change-password',isBlockedUser,changePassword)
// ----------------------------------------------------

userRouter
  .route("/address")
  .get(authenticateUser, isBlockedUser, getAddressDetails)
  .post(authenticateUser, isBlockedUser, addNewAddressDetails);

userRouter
  .route("address/:id")
  .put(authenticateUser, isBlockedUser, updateAddressDetails)
  .delete(authenticateUser, isBlockedUser, updateAddressDetails);

// ----------------------------------------------------

userRouter
  .route("/cart")
  .get(authenticateUser, isBlockedUser, getCartProducts)
  .post(authenticateUser, isBlockedUser, addToCart)
  .patch(authenticateUser, isBlockedUser, updateCartQuantity)
  .delete(authenticateUser, isBlockedUser, removeFromCart);

// ----------------------------------------------------

userRouter.get('/checkout',authenticateUser,isBlockedUser,getCartItems)

userRouter.post('/orders',authenticateUser,isBlockedUser,orderSuccess)
// ----------------------------------------------------

userRouter.post("/refresh-token", refreshUserAccessToken);
export default userRouter;
