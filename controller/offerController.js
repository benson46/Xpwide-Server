import mongoose from "mongoose";
import { calculateBestOffer } from "../utils/calculateBestOffer.js";
import Product from "../model/proudctModel.js";
import Offer from "../model/offerModel.js";
import Category from "../model/categoryModel.js";

export const createOffer = async (req, res) => {
  try {
    const { offerType, name, value, endDate, product, category } = req.body;

    // Validate required fields
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

    // Validate discount range (1-80%)
    if (isNaN(value) || value < 1 || value > 80) {
      return res.status(400).json({
        success: false,
        error: "Invalid discount value. It must be between 1% and 80%.",
      });
    }

    // Check for duplicate offer names
    const existingOffer = await Offer.findOne({ name });
    if (existingOffer) {
      return res.status(400).json({
        success: false,
        error: "An offer with this name already exists",
      });
    }

    // Ensure product or category doesn't already have an active offer
    if (offerType === "product") {
      const productWithOffer = await Product.findById(product).select("activeOffer");
      if (productWithOffer?.activeOffer) {
        return res.status(400).json({
          success: false,
          error: "This product already has an active offer",
        });
      }
    } else if (offerType === "category") {
      const categoryWithOffer = await Category.findById(category).select("activeOffer");
      if (categoryWithOffer?.activeOffer) {
        return res.status(400).json({
          success: false,
          error: "This category already has an active offer",
        });
      }
    }

    // Create Offer
    const offer = await Offer.create({
      offerType,
      name,
      value,
      endDate,
      [offerType]: offerType === "product" ? product : category,
      isActive: true,
    });

    if (offerType === "product") {
      // Assign offer to product and recalculate discount
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
      // If it's a category offer, update all products in the category
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
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};




export const getOffers = async (req, res) => {
  const { type } = req.query;
  const filter = type ? { offerType: type } : {};

  const offers = await Offer.find(filter)
    .populate("product", "name")
    .populate("category", "title");

  res.json({
    success: true,
    data: offers,
  });
};

export const updateOffer = async (req, res) => {
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

    const existingOfferData = await Offer.findById(id);
    if (!existingOfferData) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found'
      });
    }

    if (offerType === 'product' && product !== existingOfferData.product?.toString()) {
      const productWithOffer = await Product.findById(product).select('activeOffer');
      if (productWithOffer?.activeOffer) {
        return res.status(400).json({
          success: false,
          error: 'The selected product already has an active offer'
        });
      }
    } else if (offerType === 'category' && category !== existingOfferData.category?.toString()) {
      const categoryWithOffer = await Category.findById(category).select('activeOffer');
      if (categoryWithOffer?.activeOffer) {
        return res.status(400).json({
          success: false,
          error: 'The selected category already has an active offer'
        });
      }
    }

    if (existingOfferData.offerType === 'product') {
      await Product.findByIdAndUpdate(existingOfferData.product, { activeOffer: null });
    } else {
      await Category.findByIdAndUpdate(existingOfferData.category, { activeOffer: null });
    }

    const updatedOffer = await Offer.findByIdAndUpdate(
      id,
      {
        offerType,
        name,
        value,
        endDate,
        [offerType]: offerType === 'product' ? product : category
      },
      { new: true }
    );

    if (offerType === 'product') {
      await Product.findByIdAndUpdate(product, { activeOffer: id });
    } else {
      await Category.findByIdAndUpdate(category, { activeOffer: id });
    }

    return res.status(200).json({
      success: true,
      data: updatedOffer
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await Offer.findById(id);
    if (!offer) {
      return res.status(404).json({
        success: false,
        error: "Offer not found",
      });
    }

    if (offer.offerType === "product") {
      await Product.findByIdAndUpdate(offer.product, { activeOffer: null });
    } else if (offer.offerType === "category") {
      await Category.findByIdAndUpdate(offer.category, { activeOffer: null });
    }

    await Offer.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: "Offer deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const searchProducts = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Search query required",
      });
    }

    const products = await Product.find({
      name: { $regex: query, $options: "i" },
    }).select("_id name");

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().select("_id title");
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};