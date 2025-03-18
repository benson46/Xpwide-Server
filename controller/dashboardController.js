import Order from "../model/orderModel.js";
import Product from "../model/productModel.js";
import SalesReport from "../model/salesModel.js";

// METHOD GET || SALES OVERVIEW DATA
export const getSalesOverview = async (req, res, next) => {
    const { period = "monthly" } = req.query;
  
    try {
      const groupBy = period === "yearly" ? "$year" : "$month";
  
      const salesData = await SalesReport.aggregate([
        {
          $group: {
            _id: {
              [groupBy]: "$orderDate",
            },
            totalSales: { $sum: 1 },
            totalRevenue: { $sum: "$finalAmount" },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);
  
      res.json({
        success: true,
        data: salesData,
      });
    } catch (error) {
      console.error("Sales overview error:", error);
      next(error);
    }
  };

  // METHOD GET || TOP 10 BEST-SELLING PRODUCTS
export const getBestSellingProducts = async (req, res, next) => {
    try {
      const products = await SalesReport.aggregate([
        { $unwind: "$product" },
        {
          $group: {
            _id: "$product.productId",
            totalQuantity: { $sum: "$product.quantity" },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        { $unwind: "$productDetails" },
        {
          $project: {
            productName: "$productDetails.name",
            totalQuantity: 1,
          },
        },
      ]);
  
      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      console.error("Best-selling products error:", error);
      next(error);
    }
  };

  // METHOD GET || TOP 10 BEST-SELLING CATEGORIES
export const getBestSellingCategories = async (req, res, next) => {
    try {
      const categories = await SalesReport.aggregate([
        { $unwind: "$product" },
        {
          $group: {
            _id: "$product.category",
            totalRevenue: { $sum: "$product.totalPrice" },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 },
      ]);
  
      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      console.error("Best-selling categories error:", error);
      next(error);
    }
  };


  // METHOD GET || TOP 10 BEST-SELLING BRANDS
export const getBestSellingBrands = async (req, res, next) => {
    try {
      const brands = await SalesReport.aggregate([
        { $unwind: "$product" },
        {
          $group: {
            _id: "$product.brand",
            totalRevenue: { $sum: "$product.totalPrice" },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 },
      ]);
  
      res.json({
        success: true,
        data: brands,
      });
    } catch (error) {
      console.error("Best-selling brands error:", error);
      next(error);
    }
  };

