import express from "express";
import {
  adminLogin,
  adminLogout,
  getUsersList,
  refreshAdminAccessToken,
  updateUserStatus,
} from "../controller/adminController.js";

import {
  addNewCategory,
  getAllCategories,
  updateCategory,
  updateCategoryStatus,
} from "../controller/categoryController.js";

import {
  addNewBrands,
  getAllBrands,
  updateBrand,
  updateBrandStatus,
} from "../controller/brandController.js";

import {
  addNewProduct,
  editProduct,
  getAllProducts,
  updateFeaturedProducts,
  updateProductStatus,
} from "../controller/productController.js";

import {
  cancelOrderItem,
  getAllOrdersAdmin,
  handleReturnRequest,
  updateOrderStatus,
} from "../controller/orderController.js";

import { authenticateAdmin } from "../middleware/authenticateAdmin.js";
import { addNewCoupon, delelteCoupon, getAllCoupon, updateCoupon } from "../controller/couponController.js";
import { createOffer, deleteOffer, getCategories, getOffers, searchProducts, updateOffer } from "../controller/offerController.js";

const adminRouter = express.Router();

// ---------------- ADMIN AUTH ----------------
adminRouter.post("/login", adminLogin);
adminRouter.post("/logout", adminLogout);
adminRouter.post("/refresh-access-token", refreshAdminAccessToken);

// ---------------- USERS MANAGEMENT ----------------
adminRouter
  .route("/users-list")
  .get(authenticateAdmin, getUsersList)
  .patch(authenticateAdmin, updateUserStatus);

// ---------------- CATEGORY MANAGEMENT ----------------
adminRouter
  .route("/category")
  .get(authenticateAdmin, getAllCategories)
  .post(authenticateAdmin, addNewCategory)
  .patch(authenticateAdmin, updateCategoryStatus);

adminRouter.put("/category/:categoryID", authenticateAdmin, updateCategory);

// ---------------- BRAND MANAGEMENT ----------------
adminRouter
  .route("/brands")
  .get(authenticateAdmin, getAllBrands)
  .post(authenticateAdmin, addNewBrands)
  .patch(authenticateAdmin, updateBrandStatus);

adminRouter.put("/brands/:brandId", authenticateAdmin, updateBrand);

// ---------------- PRODUCT MANAGEMENT ----------------
adminRouter
  .route("/products")
  .get(authenticateAdmin, getAllProducts)
  .post(authenticateAdmin, addNewProduct)
  .patch(authenticateAdmin, updateProductStatus);

adminRouter.put("/products/:productId", authenticateAdmin, editProduct);
adminRouter.patch(
  "/products/feature",
  authenticateAdmin,
  updateFeaturedProducts
);

// ---------------- ORDER MANAGEMENT ----------------
adminRouter.get("/orders", authenticateAdmin, getAllOrdersAdmin);
adminRouter.put(
  "/orders/:orderId/status",
  authenticateAdmin,
  updateOrderStatus
);
adminRouter.put(
  "/orders/:orderId/cancel/:productId",
  authenticateAdmin,
  cancelOrderItem
);
adminRouter.patch(
  "/orders/:orderId/handle-return/:productId",
  handleReturnRequest
);

// ---------------- COUPON MANAGEMENT ----------------
adminRouter
  .route("/coupon")
  .get(authenticateAdmin, getAllCoupon)
  .post(authenticateAdmin, addNewCoupon);

adminRouter.put('/coupon/:id',authenticateAdmin,updateCoupon)
adminRouter.delete('/coupon/:id',authenticateAdmin,delelteCoupon)

adminRouter.post('/offers/createoffer', authenticateAdmin, createOffer);
adminRouter.get('/offers/getoffers', authenticateAdmin, getOffers);
adminRouter.get('/offers/products/search', authenticateAdmin, searchProducts);
adminRouter.get('/offers/categories', authenticateAdmin, getCategories);
adminRouter.put('/offers/:id', authenticateAdmin, updateOffer);
adminRouter.delete('/offers/:id', authenticateAdmin, deleteOffer);

export default adminRouter;
