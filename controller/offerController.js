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

    // Ensure the product or category doesn't already have an active offer
    // Add explicit check for existing active offers for product/category
    if (offerType === "product") {
      const existingProductOffer = await Offer.findOne({
        product,
        isActive: true,
        offerType: "product",
      });
      if (existingProductOffer) {
        return res.status(400).json({
          success: false,
          error: "This product already has an active offer",
        });
      }
    } else if (offerType === "category") {
      const existingCategoryOffer = await Offer.findOne({
        category,
        isActive: true,
        offerType: "category",
      });
      if (existingCategoryOffer) {
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

    // Populate the offer with category title or product name
    const populatedOffer = await Offer.findById(offer._id)
      .populate(
        offerType === "product" ? "product" : "category",
        offerType === "product" ? "name" : "title"
      )
      .exec();

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
      // For category offers, update the category to reflect that it now has an offer.
      await Category.findByIdAndUpdate(category, {
        hasOffer: true,
      });

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
      offer: populatedOffer, 
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

    const [totalProductOffers,totalCategoryOffers] = await Promise.all([
      Offer.countDocuments({offerType:"product"}),
      Offer.countDocuments({offerType:"category"}),
    ])
    res.json({
      success: true,
      data: offers,
      totalCategoryOffers,
      totalProductOffers
    });
  } catch (error) {
    next(error);
  }
};

export const getOfferCategories = async (req, res, next) => {
  try {
    const categories = await Category.find();
    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

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

    const existingOfferWithSameName = await Offer.findOne({
      name,
      _id: { $ne: id },
    });
    if (existingOfferWithSameName) {
      return res.status(400).json({
        success: false,
        error: "An offer with this name already exists",
      });
    }

    // Fetch the current offer to check for category changes
    const currentOffer = await Offer.findById(id);
    if (!currentOffer) {
      return res.status(404).json({
        success: false,
        error: "Offer not found",
      });
    }

    // For a category offer, if the category is changing ensure no conflict
    if (offerType === "category") {
      if (String(currentOffer.category) !== category) {
        const newCategory = await Category.findById(category).select("hasOffer");
        if (newCategory && newCategory.hasOffer) {
          return res.status(400).json({
            success: false,
            error: "This category already has an active offer",
          });
        }
        // Remove the offer flag from the old category
        if (currentOffer.category) {
          await Category.findByIdAndUpdate(currentOffer.category, {
            hasOffer: false,
          });
        }
      }
    }

    // Update the offer and populate the appropriate field
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
    ).populate(offerType === "product" ? "product" : "category");

    // For a category offer, mark the new category as having an offer
    if (offerType === "category") {
      await Category.findByIdAndUpdate(category, { hasOffer: true });
    }

    return res.status(200).json({
      success: true,
      offer: updatedOffer,
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

    // Delete the offer from the Offer collection
    await Offer.findByIdAndDelete(id);

    // Update products that reference this offer.
    await Product.updateMany(
      { activeOffer: id },
      { $set: { activeOffer: null, offer: null, hasOffer: false } }
    );

    if (offer.offerType === "category" && offer.category) {
      await Category.findByIdAndUpdate(offer.category, { hasOffer: false });
    }

    return res.status(200).json({
      success: true,
      message: "Offer deleted successfully and removed from products",
    });
  } catch (error) {
    next(error);
  }
};

// _______________________________________________________________________//
