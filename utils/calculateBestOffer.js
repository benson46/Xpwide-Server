import mongoose from "mongoose";
import Offer from "../model/offerModel.js";

export const calculateBestOffer = async (product) => {
  if (!product || typeof product.discountedPrice !== "number") {
    console.error("Invalid product or price:", product);
    return { originalPrice: 0, discountedPrice: 0, hasOffer: false, offer: null };
  }

  // Fetch active offers for the product and its category
  const categoryOffer = await Offer.findOne({
    offerType: "category",
    category: product.category._id,
    endDate: { $gt: new Date() },
    isActive: true,
  });

  const allOffers = await Offer.find({ product: product._id });


const productOffer = await Offer.findOne({
  offerType: "product",
  product: product._id, 
  isActive: true,
});

  console.log("product d price: ",product._doc.price)
  let originalPrice = product._doc.price ; // Use the current discounted price as base
  let bestOffer = null;
  let finalPrice = originalPrice;

  if (categoryOffer) {
    const categoryDiscountedPrice = originalPrice * (1 - categoryOffer.value / 100);
    finalPrice = categoryDiscountedPrice;
    bestOffer = categoryOffer;
  }

  if (productOffer) {
    const productDiscountedPrice = originalPrice * (1 - productOffer.value / 100);
    
    // Choose the offer that results in the lower price
    if (productDiscountedPrice < finalPrice) {
      console.log(productDiscountedPrice)
      finalPrice = productDiscountedPrice;
      bestOffer = productOffer;
    }
  }

  return {
    originalPrice,
    discountedPrice: finalPrice,
    hasOffer: !!bestOffer,
    offer: bestOffer,
  };
};
