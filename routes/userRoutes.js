import express from "express";
import {
  changePassword,
  forgetPasswordOtp,
  getUserSpecificInfo,
  login,
  logout,
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
  editProfileDetails,
  getProfileDetails,
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
  retryPayment,
} from "../controller/checkoutController.js";
import {
  cancelOrderItem,
  generateInvoice,
  getAllOrders,
  initiateReturn,
} from "../controller/orderController.js";
import { getWalletDetails, updateWalletBalance } from "../controller/walletController.js";
import { addWishlist, getWishlist } from "../controller/wishlistController.js";
import { applyCoupon, getPublicCoupons } from "../controller/couponController.js";
import { searchProductsUser } from "../controller/searchController.js";

const userRouter = express.Router();

/* ---------------------------- USER AUTH ---------------------------- */

userRouter.post("/login", login);
userRouter.post("/logout",authenticateUser, logout);
userRouter.post("/send-otp", sendOtp);
userRouter.post("/forgot-password-otp", forgetPasswordOtp);
userRouter.post("/resend-otp", resendOTP);
userRouter.post("/verify-otp", verifyOTP);
userRouter.post("/reset-password", resetPassword);


userRouter.get("/products/search",searchProductsUser)

/* ---------------------------- CATEGORY MANAGEMENT ---------------------------- */

userRouter.get("/category", getAllCategories);

/* ---------------------------- PRODUCT MANAGEMENT ---------------------------- */

userRouter
  .route("/products")
  .get( getProducts);

userRouter.get("/product", getProductDetails);
userRouter.get("/featured-products", getFeaturedProducts);
userRouter.get("/related-products", getRelatedProducts);

/* ---------------------------- PROFILE MANAGEMENT ---------------------------- */

userRouter
  .route("/profile")
  .get(authenticateUser, isBlockedUser, getProfileDetails)
  .put(authenticateUser, isBlockedUser, editProfileDetails);

userRouter.post("/change-password",authenticateUser, isBlockedUser, changePassword);

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
userRouter.patch("/orders/:orderId/return/:productId",authenticateUser,isBlockedUser, initiateReturn);
userRouter.get('/orders/:orderId/invoice',authenticateUser,isBlockedUser,generateInvoice)
userRouter.post('/orders/:orderId/retry-payment',authenticateUser,isBlockedUser,retryPayment)
/* ---------------------------- WALLET MANAGEMENT ---------------------------- */

userRouter
  .route('/wallet')
  .get(authenticateUser,isBlockedUser, getWalletDetails)
  .put(authenticateUser,isBlockedUser, updateWalletBalance);

/* ---------------------------- WISHLIST MANAGEMENT ---------------------------- */

userRouter.get('/get-wishlist', authenticateUser,isBlockedUser, getWishlist);
userRouter.post('/add-wishlist', authenticateUser,isBlockedUser, addWishlist);

/* ---------------------------- COUPON MANAGEMENT ---------------------------- */
userRouter.get('/coupon/public',authenticateUser,isBlockedUser,getPublicCoupons)
userRouter.post("/coupon/apply", authenticateUser,isBlockedUser,applyCoupon);

/* ---------------------------- USER INFO ---------------------------- */

userRouter.get('/get-user-info', authenticateUser,isBlockedUser, getUserSpecificInfo);

export default userRouter;
