import express from "express";
import {
  changePassword,
  forgetPasswordOtp,
  getUserSpecificInfo,
  login,
  logout,
  refreshUserAccessToken,
  resendOTP,
  resetPassword,
  sendOtp,
  verifyOTP,
} from "../controller/userController.js";
import {
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
  getCartProducts,
  addToCart,
  modifyCartQuantity,
  removeFromCart,
} from "../controller/cartController.js";
import {
  checkoutOrderSuccess,
  getCartItems,
} from "../controller/checkoutController.js";
import {
  cancelOrderItem,
  getAllOrders,
  initiateReturn,
} from "../controller/orderController.js";
import { getWalletDetails, updateWalletbalance } from "../controller/walletController.js";
import { addWishlist, getWishlist } from "../controller/wishlistController.js";
import { applyCoupon, getPublicCoupons } from "../controller/couponController.js";

const userRouter = express.Router();

/* ---------------------------- USER AUTH ---------------------------- */

userRouter.post("/login", login);
userRouter.post("/logout", logout);
userRouter.post("/send-otp", sendOtp);
userRouter.post("/forgot-password-otp", forgetPasswordOtp);
userRouter.post("/resend-otp", resendOTP);
userRouter.post("/verify-otp", verifyOTP);
userRouter.post("/reset-password", resetPassword);
userRouter.post("/refresh-token", refreshUserAccessToken);

/* ---------------------------- CATEGORY MANAGEMENT ---------------------------- */

userRouter.get("/category", isBlockedUser, getAllCategories);

/* ---------------------------- PRODUCT MANAGEMENT ---------------------------- */

userRouter
  .route("/products")
  .get(isBlockedUser, getProducts);

userRouter.get("/product", getProductDetails);
userRouter.get("/featured-products", getFeaturedProducts);
userRouter.get("/related-products", getRelatedProducts);

/* ---------------------------- PROFILE MANAGEMENT ---------------------------- */

userRouter
  .route("/profile")
  .get(authenticateUser, isBlockedUser, getProfileDetials)
  .put(authenticateUser, isBlockedUser, editProfileDetials);

userRouter.post("/change-password", isBlockedUser, changePassword);

/* ---------------------------- ADDRESS MANAGEMENT ---------------------------- */

userRouter
  .route("/address")
  .get(authenticateUser, isBlockedUser, getAddressDetails)
  .post(authenticateUser, isBlockedUser, addNewAddressDetails);

userRouter
  .route("/address/:id")
  .put(authenticateUser, isBlockedUser, updateAddressDetails)
  .delete(authenticateUser, isBlockedUser, deleteAddressDetails);

/* ---------------------------- CART MANAGEMENT ---------------------------- */

userRouter
  .route("/cart")
  .get(authenticateUser, isBlockedUser, getCartProducts)
  .post(authenticateUser, isBlockedUser, addToCart)
  .patch(authenticateUser, isBlockedUser, modifyCartQuantity)
  .delete(authenticateUser, isBlockedUser, removeFromCart);

/* ---------------------------- CHECKOUT ---------------------------- */

userRouter.get("/checkout", authenticateUser, isBlockedUser, getCartItems);
userRouter.post(
  "/checkout-order-success",
  authenticateUser,
  isBlockedUser,
  checkoutOrderSuccess
);

/* ---------------------------- ORDER MANAGEMENT ---------------------------- */

userRouter.get("/orders", authenticateUser, isBlockedUser, getAllOrders);
userRouter.patch(
  "/orders/:orderId/cancel/:productId",
  authenticateUser,
  cancelOrderItem
);
userRouter.patch("/orders/:orderId/return/:productId", initiateReturn);

/* ---------------------------- WALLET MANAGEMENT ---------------------------- */

userRouter
  .route('/wallet')
  .get(authenticateUser, getWalletDetails)
  .post(authenticateUser, updateWalletbalance);

/* ---------------------------- WISHLIST MANAGEMENT ---------------------------- */

userRouter.get('/get-wishlist', authenticateUser, getWishlist);
userRouter.post('/add-wishlist', authenticateUser, addWishlist);

/* ---------------------------- COUPON MANAGEMENT ---------------------------- */
userRouter.get('/coupon/public',getPublicCoupons)
userRouter.post("/coupon/apply", applyCoupon);

/* ---------------------------- USER INFO ---------------------------- */

userRouter.get('/get-user-info', authenticateUser, getUserSpecificInfo);

export default userRouter;
