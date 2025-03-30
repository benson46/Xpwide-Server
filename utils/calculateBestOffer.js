import Offer from "../model/offerModel.js";

export const calculateBestOffer = async (product) => {
  // Validate using the correct price property
  if (!product || typeof product._doc.price !== "number") {
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

  const productOffer = await Offer.findOne({
    offerType: "product",
    product: product._id,
    isActive: true,
  });

  let originalPrice = product._doc.price;
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
