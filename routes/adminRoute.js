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
import { addNewProduct, editProduct, getAllProducts, updateProductStatus } from "../controller/productController.js";
import { authenticateAdmin } from "../middleware/authenticateAdmin.js";

const adminRouter = express.Router();
// ----------------------------------------------------

// adminRouter.post("/signup", adminSignup);
adminRouter.post("/login", adminLogin);
adminRouter.post("/logout", adminLogout);
// ----------------------------------------------------

adminRouter.route("/users-list")
.get(authenticateAdmin,getUsersList)
.patch(authenticateAdmin,updateUserStatus);


// ----------------------------------------------------

adminRouter
  .route("/category")
  .get(authenticateAdmin,getAllCategories)
  .post(authenticateAdmin,addNewCategory)
  .patch(authenticateAdmin,updateCategoryStatus);

adminRouter.route("/category/:categoryID").put(authenticateAdmin,updateCategory);

// ----------------------------------------------------

adminRouter
  .route("/brands")
  .get(authenticateAdmin,getAllBrands)
  .post(authenticateAdmin,addNewBrands)
  .patch(authenticateAdmin,updateBrandStatus);

adminRouter.route("/brands/:brandId").put(authenticateAdmin,updateBrand);

// ----------------------------------------------------
adminRouter
  .route("/products")
  .get(authenticateAdmin,getAllProducts)
  .post(authenticateAdmin,addNewProduct)
  .patch(authenticateAdmin,updateProductStatus);
  
adminRouter.put("/products/:products",authenticateAdmin,editProduct)

// ----------------------------------------------------
adminRouter.post("/refresh-access-token", refreshAdminAccessToken);

export default adminRouter;
