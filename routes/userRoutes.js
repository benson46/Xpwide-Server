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
  addToCart,
  getCartProducts,
  removeFromCart,
  updateCartQuantity,
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
import Order from "../model/orderModel.js";
import { getWalletDetails, updateWalletbalance } from "../controller/walletController.js";
import { addWishlist, getWishlist } from "../controller/wishlistController.js";


const userRouter = express.Router();

// ---------------- USER AUTH ----------------

userRouter.post("/login", login);
userRouter.post("/send-otp", sendOtp);
userRouter.post("/forgot-password-otp", forgetPasswordOtp);
userRouter.post("/resend-otp", resendOTP);
userRouter.post("/verify-otp", verifyOTP);
userRouter.post("/reset-password", resetPassword);
userRouter.post("/logout", logout);
userRouter.post("/refresh-token", refreshUserAccessToken);

// ---------------- CATEGORY MANAGEMENT ----------------

userRouter.get("/category", isBlockedUser, getAllCategories);

// ---------------- PRODUCT MANAGEMENT ----------------

userRouter.get("/product", isBlockedUser, getProductDetails);
userRouter.get("/products", isBlockedUser, getProducts);
userRouter.get("/featured-products", isBlockedUser, getFeaturedProducts);
userRouter.get("/related-products", isBlockedUser, getRelatedProducts);

// ---------------- PROFILE MANAGEMENT ----------------

userRouter
  .route("/profile")
  .get(authenticateUser, isBlockedUser, getProfileDetials)
  .put(authenticateUser, isBlockedUser, editProfileDetials);

userRouter.post("/change-password", isBlockedUser, changePassword);

// ---------------- ADDRESS MANAGEMENT ----------------

userRouter
  .route("/address")
  .get(authenticateUser, isBlockedUser, getAddressDetails)
  .post(authenticateUser, isBlockedUser, addNewAddressDetails);

userRouter
  .route("/address/:id")
  .put(authenticateUser, isBlockedUser, updateAddressDetails)
  .delete(authenticateUser, isBlockedUser, deleteAddressDetails);

// ---------------- CART MANAGEMENT ----------------

userRouter
  .route("/cart")
  .get(authenticateUser, isBlockedUser, getCartProducts)
  .post(authenticateUser, isBlockedUser, addToCart)
  .patch(authenticateUser, isBlockedUser, updateCartQuantity)
  .delete(authenticateUser, isBlockedUser, removeFromCart);

// ---------------- CHECKOUT ROUTES ----------------

userRouter.get("/checkout", authenticateUser, isBlockedUser, getCartItems);
userRouter.post(
  "/checkout-order-success",
  authenticateUser,
  isBlockedUser,
  checkoutOrderSuccess
);

// ---------------- ORDER MANAGEMENT ----------------

userRouter.get("/orders", authenticateUser, isBlockedUser, getAllOrders);
userRouter.patch(
  "/orders/:orderId/cancel/:productId",
  authenticateUser,
  cancelOrderItem
);

userRouter.patch("/orders/:orderId/return/:productId", initiateReturn);

// ---------------- Wallet MANAGEMENT ----------------

userRouter.route('/wallet').get(authenticateUser,getWalletDetails).post(authenticateUser,updateWalletbalance)

// ---------------- Wishlist MANAGEMENT ----------------

userRouter.get('/get-wishlist',authenticateUser,getWishlist)
userRouter.post('/add-wishlist',authenticateUser,addWishlist);

// ----------------------------------------------------

userRouter.get('/get-user-info',authenticateUser,getUserSpecificInfo)
export default userRouter;
