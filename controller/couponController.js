import Category from "../model/categoryModel.js";
import Coupon from "../model/couponModel.js";
import Product from "../model/proudctModel.js";

export const getAllCoupon = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const totalCoupons = await Coupon.countDocuments();
    const coupons = await Coupon.find().skip(skip).limit(Number(limit));

    res.json({ coupons, totalCoupons });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create a new coupon
export const addNewCoupon = async (req, res) => {
  let {
    code,
    discount,
    minPurchaseAmount,
    startingDate,
    expiryDate,
    usageLimit,
    eligibleCategories,
  } = req.body;
  

  if (
    !code ||
    !minPurchaseAmount ||
    !startingDate ||
    !expiryDate ||
    !usageLimit ||
    !eligibleCategories
  ) {
    return res.status(400).json({ message: "All fields are required." });
  }

  // If "all" is selected, fetch all category IDs
  if (eligibleCategories.includes("all")) {
    const allCategories = await Category.find({}, "_id");
    eligibleCategories = allCategories.map((category) => category._id);
  }

  const existingCoupon = await Coupon.findOne({ code });
  if (existingCoupon) {
    return res.status(400).json({ message: "Coupon code already exists." });
  }

  if (discount < 1 || discount > 100) {
    return res.status(400).json({ message: "Discount must be between 1-100%" });
  }

  if (new Date(expiryDate) <= new Date(startingDate)) {
    return res.status(400).json({ message: "Expiry date must be after start date" });
  }

  if (minPurchaseAmount < 0) {
    return res.status(400).json({ message: "Minimum purchase amount cannot be negative" });
  }

  const coupon = new Coupon({
    code,
    discount,
    minPurchaseAmount,
    startingDate,
    expiryDate,
    usageLimit,
    eligibleCategories,
  });

  try {
    const newCoupon = await coupon.save();
    res.status(201).json(newCoupon);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    let coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

     // Add validation for dates
     if (updateData.expiryDate && new Date(updateData.expiryDate) <= new Date(coupon.startingDate)) {
      return res.status(400).json({ message: "Expiry date must be after start date" });
    }

    // Add validation for discount
    if (updateData.discount && (updateData.discount < 1 || updateData.discount > 100)) {
      return res.status(400).json({ message: "Discount must be between 1-100%" });
    }

    if (updateData.startingDate !== undefined) {
      coupon.startingDate = new Date(updateData.startingDate);
    }

    
    if (updateData.code) coupon.code = updateData.code.toUpperCase();
    if (updateData.discount) coupon.discount = updateData.discount;
    if (updateData.minPurchaseAmount) coupon.minPurchaseAmount = updateData.minPurchaseAmount;
    if (updateData.expiryDate) coupon.expiryDate = new Date(updateData.expiryDate);
    if (updateData.usageLimit !== undefined) coupon.usageLimit = updateData.usageLimit;
    if (updateData.eligibleCategories) coupon.eligibleCategories = updateData.eligibleCategories;

    coupon.isActive =
      (!coupon.expiryDate || coupon.expiryDate > new Date()) &&
      (coupon.usageLimit === null || coupon.usageCount < coupon.usageLimit);

    coupon.updatedAt = Date.now(); 

    await coupon.save();

    res.status(200).json({ message: "Coupon updated successfully", coupon });
  } catch (error) {
    console.error("Error updating coupon:", error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: "Server error, could not update coupon" });
  }
};


export const delelteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    res.json({ message: "Coupon deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting coupon" });
  }
};


// Apply coupon controller
export const applyCoupon = async (req, res) => {
  try {
    const { code, cartTotal, cartItems } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Coupon code is required." });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({ message: "Invalid coupon code." });
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ message: "This coupon has expired." });
    }

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({ message: "This coupon has reached its usage limit." });
    }

    if (cartTotal < coupon.minPurchaseAmount) {
      return res.status(400).json({
        message: `Minimum purchase amount should be $${coupon.minPurchaseAmount}.`,
      });
    }

    // Check eligible categories using productIds from cartItems
    if (coupon.eligibleCategories.length > 0 && !coupon.eligibleCategories.includes("all")) {
      const productIds = cartItems.map((item) => item.productId);
      const products = await Product.find({ _id: { $in: productIds } }, "category");
      const cartCategoryIds = products.map((product) => product.category.toString());

      const eligible = cartCategoryIds.some((categoryId) =>
        coupon.eligibleCategories.includes(categoryId)
      );

      if (!eligible) {
        return res.status(400).json({
          message: "This coupon is not valid for items in your cart.",
        });
      }
    }

    const discountAmount = (cartTotal * coupon.discount) / 100;
    const newTotal = cartTotal - discountAmount;

    res.status(200).json({
      message: "Coupon applied successfully!",
      discountAmount,
      newTotal,
    });
  } catch (error) {
    console.error("Error applying coupon:", error);
    res.status(500).json({ message: "Server error, could not apply coupon." });
  }
};