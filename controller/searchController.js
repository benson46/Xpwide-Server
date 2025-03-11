import User from "../model/userModel.js";
import Product from "../model/productModel.js";
import Coupon from "../model/couponModel.js";
import Category from "../model/categoryModel.js";
import Brand from "../model/brandModel.js";

export const searchProductsUser = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required." });
    }

    // Perform a case-insensitive search on the product name
    const products = await Product.find({
      name: { $regex: query, $options: "i" },
    });

    return res.status(200).json({ data: products });
  } catch (error) {
    next(error);
  }
};


export const searchProducts = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required." });
    }

    // Perform a case-insensitive search on the product name
    const products = await Product.find({
      name: { $regex: query, $options: "i" },
    });

    return res.status(200).json({ data: products });
  } catch (error) {
    next(error);
  }
};

export const searchUsers = async(req,res,next) =>{
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required." });
    }
    
    const users = await User.find({
      email: { $regex: query, $options: "i" },
    });

    return res.status(200).json({ data: users });
  } catch (error) {
    next(error);
  }
};

export const searchCategories = async(req,res,next) =>{
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required." });
    }

    const categories = await Category.find({
      title: { $regex: query, $options: "i" },
    });
    return res.status(200).json({ data: categories });
  } catch (error) {
    next(error);
  }
};

export const searchBrands = async(req,res,next) =>{
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required." });
    }

    const brands = await Brand.find({
      title: { $regex: query, $options: "i" },
    });
    return res.status(200).json({ data: brands });
  } catch (error) {
    next(error);
  }
};

export const searchCoupons = async(req,res,next) =>{
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required." });
    }

    const coupons = await Coupon.find({
      code: { $regex: query, $options: "i" },
    });

    return res.status(200).json({ data: coupons });
  } catch (error) {
    next(error);
  }
};