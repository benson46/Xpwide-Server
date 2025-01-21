import express from "express";
import {
  adminLogin,
  adminLogout,
  checkUserStatus,
  getUsersList,
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

const adminRouter = express.Router();
// ----------------------------------------------------

// adminRouter.post("/signup", adminSignup);
adminRouter.post("/login", adminLogin);
adminRouter.post("/logout", adminLogout);
// ----------------------------------------------------

adminRouter.route("/users-list")
.get(getUsersList)
.patch(updateUserStatus);

// Example Express.js route
adminRouter.get('/check-status',checkUserStatus );

// ----------------------------------------------------

adminRouter
  .route("/category")
  .get(getAllCategories)
  .post(addNewCategory)
  .patch(updateCategoryStatus);

adminRouter.route("/category/:categoryID").put(updateCategory);

// ----------------------------------------------------

adminRouter
  .route("/brands")
  .get(getAllBrands)
  .post(addNewBrands)
  .patch(updateBrandStatus);

adminRouter.route("/brands/:brandId").put(updateBrand);

// ----------------------------------------------------
adminRouter
  .route("/products")
  .get(getAllProducts)
  .post(addNewProduct)
  .patch(updateProductStatus);
  
adminRouter.put("/products/:products",editProduct)


export default adminRouter;
