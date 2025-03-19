import express from "express";
import {
  adminLogin,
  adminLogout,
  getUsersList,
  updateUserStatus,
} from "../controller/adminController.js";

import {
  getAllCategories,
  addCategory,
  updateCategory,
  updateCategoryStatus,
} from "../controller/categoryController.js";

import {
  addBrand,
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
  getAllOrdersAdmin,
  updateOrderStatus,
  cancelOrderItem,
  handleReturnRequest,
} from "../controller/orderController.js";

import { authenticateAdmin } from "../middleware/authenticateAdmin.js";
import {
  addNewCoupon,
  deleteCoupon,
  getAllCoupons,
  updateCoupon,
} from "../controller/couponController.js";
import {
  createOffer,
  deleteOffer,
  getOfferCategories,
  getOffers,
  updateOffer,
} from "../controller/offerController.js";
import {
  downloadExcelReport,
  downloadPDFReport,
  getSalesReport,
} from "../controller/salesController.js";
import {searchBrands, searchCategories, searchCoupons, searchProducts, searchUsers } from "../controller/searchController.js";
import { createBanner, deleteBanner, getBanners, toggleBannerStatus, updateBanner } from "../controller/bannerController.js";
import { getBestSellingBrands, getBestSellingCategories, getBestSellingProducts, getSalesOverview } from "../controller/dashboardController.js";

const adminRouter = express.Router();

/* ---------------------------- ADMIN AUTH ---------------------------- */

// METHOD POST || ADMIN LOGIN
adminRouter.post("/login", adminLogin);

// METHOD POST || ADMIN LOGOUT
adminRouter.post("/logout", adminLogout);

// // METHOD POST || REFRESH ADMIN ACCESS TOKEN
// adminRouter.post("/refresh-access-token", refreshAdminAccessToken);

adminRouter.get("/products/search", authenticateAdmin, searchProducts);
adminRouter.get("/users/search",authenticateAdmin,searchUsers)
adminRouter.get("/category/search",authenticateAdmin,searchCategories)
adminRouter.get("/brand/search",authenticateAdmin,searchBrands)
adminRouter.get("/coupons/search",authenticateAdmin,searchCoupons)

/* ---------------------------- USERS MANAGEMENT ---------------------------- */

// METHOD GET || GET USERS LIST
// METHOD PATCH || UPDATE USER STATUS (BLOCK/UNBLOCK)
adminRouter
  .route("/users-list")
  .get(authenticateAdmin, getUsersList)
  .patch(authenticateAdmin, updateUserStatus);

/* ---------------------------- CATEGORY MANAGEMENT ---------------------------- */

// METHOD GET || GET ALL CATEGORIES
// METHOD POST || ADD NEW CATEGORY
// METHOD PATCH || UPDATE CATEGORY STATUS
adminRouter
  .route("/category")
  .get(authenticateAdmin, getAllCategories)
  .post(authenticateAdmin, addCategory)
  .patch(authenticateAdmin, updateCategoryStatus);

// METHOD PUT || UPDATE CATEGORY DETAILS
adminRouter.put("/category/:categoryID", authenticateAdmin, updateCategory);

/* ---------------------------- BRAND MANAGEMENT ---------------------------- */

// METHOD GET || GET ALL BRANDS
// METHOD POST || ADD NEW BRAND
// METHOD PATCH || UPDATE BRAND STATUS
adminRouter
  .route("/brands")
  .get(authenticateAdmin, getAllBrands)
  .post(authenticateAdmin, addBrand)
  .patch(authenticateAdmin, updateBrandStatus);

// METHOD PUT || UPDATE BRAND DETAILS
adminRouter.put("/brands/:brandId", authenticateAdmin, updateBrand);

/* ---------------------------- PRODUCT MANAGEMENT ---------------------------- */

// METHOD GET || GET ALL PRODUCTS
// METHOD POST || ADD NEW PRODUCT
// METHOD PATCH || UPDATE PRODUCT STATUS
adminRouter
  .route("/products")
  .get(authenticateAdmin, getAllProducts)
  .post(authenticateAdmin, addNewProduct);


  // METHOD PATCH || UPDATE FEATURED PRODUCTS
adminRouter.patch(
  "/products/feature",
  authenticateAdmin,
  updateFeaturedProducts
);

adminRouter.patch(
  "/products/:productId",
  authenticateAdmin,
  updateProductStatus
);

// METHOD PUT || EDIT PRODUCT DETAILS
adminRouter.put("/products/edit-product", authenticateAdmin, editProduct);



/* ---------------------------- ORDER MANAGEMENT ---------------------------- */

// METHOD GET || GET ALL ORDERS
adminRouter.get("/orders", authenticateAdmin, getAllOrdersAdmin);

// METHOD PUT || UPDATE ORDER STATUS
adminRouter.put(
  "/orders/:orderId/products/:productId",
  authenticateAdmin,
  updateOrderStatus
);

// METHOD PUT || CANCEL ORDER ITEM
adminRouter.put(
  "/orders/:orderId/cancel/:productId",
  authenticateAdmin,
  cancelOrderItem
);

// METHOD PATCH || HANDLE RETURN REQUEST
adminRouter.patch(
  "/orders/:orderId/handle-return/:productId",authenticateAdmin,handleReturnRequest);

/* ---------------------------- COUPON MANAGEMENT ---------------------------- */

// METHOD GET || GET ALL COUPONS
// METHOD POST || ADD NEW COUPON
adminRouter
  .route("/coupon")
  .get(authenticateAdmin, getAllCoupons)
  .post(authenticateAdmin, addNewCoupon);

// METHOD PUT || UPDATE COUPON DETAILS
adminRouter.put("/coupon/:id", authenticateAdmin, updateCoupon);

// METHOD DELETE || DELETE COUPON
adminRouter.delete("/coupon/:id", authenticateAdmin, deleteCoupon);

/* ---------------------------- OFFER MANAGEMENT ---------------------------- */

// METHOD POST || CREATE NEW OFFER
adminRouter.post("/offers/createoffer", authenticateAdmin, createOffer);

// METHOD GET || GET ALL OFFERS
adminRouter.get("/offers/getoffers", authenticateAdmin, getOffers);

// METHOD GET || GET ALL CATEGORIES IN ADDING NEW CATEGORY OFFER
adminRouter.get("/offers/categories", authenticateAdmin, getOfferCategories);

// METHOD PUT || UPDATE OFFER DETAILS
adminRouter.put("/offers/:id", authenticateAdmin, updateOffer);

// METHOD DELETE || DELETE OFFER
adminRouter.delete("/offers/:id", authenticateAdmin, deleteOffer);

/* ---------------------------- chart MANAGEMENT ---------------------------- */
adminRouter.get("/sales-overview", authenticateAdmin, getSalesOverview);
adminRouter.get("/best-selling-products", authenticateAdmin, getBestSellingProducts);
adminRouter.get("/best-selling-categories", authenticateAdmin, getBestSellingCategories);
adminRouter.get("/best-selling-brands", authenticateAdmin, getBestSellingBrands);

/* ---------------------------- SALES MANAGEMENT ---------------------------- */
// METHOD GET || SALES REPORT
adminRouter.get("/sales-report",authenticateAdmin, getSalesReport);

// METHOD GET || DOWNLOAD SALES REPORT PDF
adminRouter.get("/download-report/pdf",authenticateAdmin, downloadPDFReport);

// METHOD GET || DOWNLOAD SALES REPORT EXCEL
adminRouter.get("/download-report/excel",authenticateAdmin, downloadExcelReport);

/* ---------------------------- BANNER MANAGEMENT ---------------------------- */
adminRouter.route('/banners')
  .post(authenticateAdmin, createBanner)
  .get(getBanners);

adminRouter.route('/banners/:id')
  .delete(authenticateAdmin, deleteBanner)
  .put(authenticateAdmin, updateBanner);

adminRouter.patch('/banners/toggle/:id', authenticateAdmin, toggleBannerStatus);

export default adminRouter;
