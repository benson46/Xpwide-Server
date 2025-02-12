import mongoose from "mongoose";
import { calculateBestOffer } from "../utils/calculateBestOffer.js";
import Product from "../model/productModel.js";
import Offer from "../model/offerModel.js";
import Category from "../model/categoryModel.js";
// _______________________________________________________________________//

// =========================== ADMIN CONTROLLERS ===========================
// METHOD POST || Create a new offer
export const createOffer = async (req, res, next) => {
  try {
    const { offerType, name, value, endDate, product, category } = req.body;
    if (
      !name ||
      !value ||
      !endDate ||
      !offerType ||
      (offerType === "product" && !product) ||
      (offerType === "category" && !category)
    ) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields ${
          offerType === "product" ? "including product" : "including category"
        }`,
      });
    }

    if (isNaN(value) || value < 1 || value > 80) {
      return res.status(400).json({
        success: false,
        error: "Invalid discount value. It must be between 1% and 80%.",
      });
    }

    const existingOffer = await Offer.findOne({ name });
    if (existingOffer) {
      return res.status(400).json({
        success: false,
        error: "An offer with this name already exists",
      });
    }

    // Ensure product or category doesn't already have an active offer
    if (offerType === "product") {
      const productWithOffer = await Product.findById(product).select(
        "activeOffer"
      );
      if (productWithOffer?.activeOffer) {
        return res.status(400).json({
          success: false,
          error: "This product already has an active offer",
        });
      }
    } else if (offerType === "category") {
      const categoryWithOffer = await Category.findById(category).select(
        "activeOffer"
      );
      if (categoryWithOffer?.activeOffer) {
        return res.status(400).json({
          success: false,
          error: "This category already has an active offer",
        });
      }
    }

    const offer = await Offer.create({
      offerType,
      name,
      value,
      endDate,
      [offerType]: offerType === "product" ? product : category,
      isActive: true,
    });

    if (offerType === "product") {
      await Product.findByIdAndUpdate(product, {
        activeOffer: offer._id,
        hasOffer: true,
      });

      const updatedProduct = await Product.findById(product);
      const bestOfferData = await calculateBestOffer(updatedProduct);

      await Product.findByIdAndUpdate(product, {
        discountedPrice: bestOfferData.discountedPrice,
      });
    } else {
      const productsInCategory = await Product.find({ category });

      for (const prod of productsInCategory) {
        const bestOfferData = await calculateBestOffer(prod);
        await Product.findByIdAndUpdate(prod._id, {
          discountedPrice: bestOfferData.discountedPrice,
        });
      }
    }

    return res.status(201).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    next(error);
  }
};

// METHOD GET || Get all offers
export const getOffers = async (req, res, next) => {
  const { type } = req.query;
  try {
    const filter = type ? { offerType: type } : {};

    const offers = await Offer.find(filter)
      .populate("product", "name")
      .populate("category", "title");

    res.json({
      success: true,
      data: offers,
    });
  } catch (error) {
    next(error);
  }
};

// =========================== COMMON CONTROLLERS ===========================

// METHOD PUT || Update an offer
export const updateOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { offerType, name, value, endDate, product, category } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid offer ID format",
      });
    }

    const existingOffer = await Offer.findOne({
      name,
      _id: { $ne: id },
    });
    if (existingOffer) {
      return res.status(400).json({
        success: false,
        error: "An offer with this name already exists",
      });
    }

    const updatedOffer = await Offer.findByIdAndUpdate(
      id,
      {
        offerType,
        name,
        value,
        endDate,
        [offerType]: offerType === "product" ? product : category,
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      data: updatedOffer,
    });
  } catch (error) {
    next(error);
  }
};

// METHOD DELETE || Delete an offer
export const deleteOffer = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid offer ID format",
      });
    }

    const offer = await Offer.findById(id);
    if (!offer) {
      return res.status(404).json({
        success: false,
        error: "Offer not found",
      });
    }

    await Offer.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: "Offer deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
// _______________________________________________________________________//
