import Category from "../model/categoryModel.js";
import Coupon from "../model/couponModel.js";
import Product from "../model/productModel.js";
// _______________________________________________________________________//

// =========================== ADMIN CONTROLLERS ===========================
// METHOD GET || Get all coupons with pagination
export const getAllCoupons = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const totalCoupons = await Coupon.countDocuments();
    const coupons = await Coupon.find().skip(skip).limit(Number(limit));
    res.json({ coupons, totalCoupons });
  } catch (err) {
    next(err);
  }
};

// METHOD POST || Create a new coupon
export const addNewCoupon = async (req, res, next) => {
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
    return res
      .status(400)
      .json({ message: "Expiry date must be after start date" });
  }

  if (minPurchaseAmount < 0) {
    return res
      .status(400)
      .json({ message: "Minimum purchase amount cannot be negative" });
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
    next(err);
  }
};

// METHOD PUT || Update coupon by ID
export const updateCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    let coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    if (
      updateData.expiryDate &&
      new Date(updateData.expiryDate) <= new Date(coupon.startingDate)
    ) {
      return res
        .status(400)
        .json({ message: "Expiry date must be after start date" });
    }

    if (
      updateData.discount &&
      (updateData.discount < 1 || updateData.discount > 100)
    ) {
      return res
        .status(400)
        .json({ message: "Discount must be between 1-100%" });
    }

    Object.assign(coupon, updateData);
    coupon.isActive =
      (!coupon.expiryDate || coupon.expiryDate > new Date()) &&
      (coupon.usageLimit === null || coupon.usageCount < coupon.usageLimit);
    coupon.updatedAt = Date.now();

    await coupon.save();
    res.status(200).json({ message: "Coupon updated successfully", coupon });
  } catch (error) {
    next(err);
  }
};

// METHOD DELETE || Delete coupon by ID
export const deleteCoupon = async (req, res,next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    res.json({ message: "Coupon deleted successfully" });
  } catch (error) {
    next(error)
  }
};

// =========================== USER CONTROLLERS ===========================
// METHOD POST || Apply a coupon to cart
export const applyCoupon = async (req, res,next) => {
  try {
    const { code, cartTotal } = req.body;

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

    if (cartTotal < coupon.minPurchaseAmount) {
      return res
        .status(400)
        .json({
          message: `Minimum purchase amount should be $${coupon.minPurchaseAmount}.`,
        });
    }

    const discountAmount = (cartTotal * coupon.discount) / 100;
    const newTotal = cartTotal - discountAmount;

    res
      .status(200)
      .json({
        message: "Coupon applied successfully!",
        discountAmount,
        newTotal,
      });
  } catch (error) {
    next(error)
  }
};
// _______________________________________________________________________//
