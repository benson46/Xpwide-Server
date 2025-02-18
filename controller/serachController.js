// controllers/searchController.mjs
import User from "../model/userModel.js";
import Product from "../model/productModel.js";
import Order from "../model/orderModel.js";
import Category from "../model/categoryModel.js";
import Brand from "../model/brandModel.js";
import Coupon from "../model/couponModel.js";
import Offer from "../model/offerModel.js";

export const adminSearchController = async (req, res) => {
  const { entity } = req.params;
  const { q } = req.query;
  const searchQuery = q ? q.trim() : "";

  try {
    let results = [];
    const regex = new RegExp(searchQuery, "i"); // Case-insensitive search

    switch (entity) {
      case "users":
        results = await User.find({ email: { $regex: regex } });
        break;
      case "products":
        results = await Product.find({ name: { $regex: regex } });
        break;
      case "coupons":
        // Search coupons by code
        results = await Coupon.find({ code: { $regex: regex } });
        break;
      default:
        return res.status(400).json({ message: "Invalid search entity." });
    }

    res.status(200).json(results);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
