import Order from "../model/orderModel.js";
import Product from "../model/productModel.js";
import SalesReport from "../model/salesModel.js";

// METHOD GET || SALES OVERVIEW DATA
export const getSalesOverview = async (req, res, next) => {
    const { period = "monthly", startDate, endDate } = req.query;
  
    try {
      // Date filter for custom range
      let match = {};
      if (startDate && endDate) {
        match.orderDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }
  
      // Determine grouping based on period
      let groupBy;
      switch (period) {
        case 'daily':
        case 'custom': // Treat 'custom' as daily grouping
          groupBy = {
            year: { $year: "$orderDate" },
            month: { $month: "$orderDate" },
            day: { $dayOfMonth: "$orderDate" },
          };
          break;
        case 'weekly':
          groupBy = {
            year: { $year: "$orderDate" },
            week: { $week: "$orderDate" },
          };
          break;
        case 'monthly':
          groupBy = {
            year: { $year: "$orderDate" },
            month: { $month: "$orderDate" },
          };
          break;
        case 'yearly':
          groupBy = { year: { $year: "$orderDate" } };
          break;
        default:
          groupBy = { year: { $year: "$orderDate" }, month: { $month: "$orderDate" } };
      }
  
      const salesData = await SalesReport.aggregate([
        { $match: match },
        {
          $group: {
            _id: groupBy,
            totalSales: { $sum: 1 },
            totalRevenue: { $sum: "$finalAmount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.week": 1 } },
      ]);
  
      // Format data for chart labels
      const formattedData = salesData.map(item => {
        let label;
        switch (period) {
          case 'daily':
          case 'custom':
            label = `${item._id.day}/${item._id.month}/${item._id.year}`;
            break;
          case 'weekly':
            label = `Week ${item._id.week}, ${item._id.year}`;
            break;
          case 'monthly':
            label = `${item._id.month}/${item._id.year}`;
            break;
          case 'yearly':
            label = `${item._id.year}`;
            break;
          default:
            label = `${item._id.month}/${item._id.year}`;
        }
        return {
          label,
          totalSales: item.totalSales,
          totalRevenue: item.totalRevenue,
        };
      });
  
      res.json({
        success: true,
        data: formattedData,
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
  
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  };


  // METHOD GET || TOP 5 BEST-SELLING BRANDS
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
        { $limit: 5 },
      ]);
  
      res.json({ success: true, data: brands });
    } catch (error) {
      next(error);
    }
  };

