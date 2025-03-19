import Cart from "../model/cartModel.js";
import Product from "../model/productModel.js";
import { calculateBestOffer } from "../utils/calculateBestOffer.js";
// _______________________________________________________________________//

// =============================== ADMIN CONTROLLERS ===============================
// METHOD GET || Fetch cart products for logged-in user
export const getCartProducts = async (req, res, next) => {
  const userId = req.user.id;
  try {
    let cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) {
      return res
        .status(200)
        .json({
          success: true,
          items: [],
          subtotal: 0,
          message: "Cart is empty.",
        });
    }

    let hasUpdates = false;
    cart.items = cart.items.filter((item) => {
      if (!item.productId) {
        hasUpdates = true;
        return false;
      }

      const stock = item.productId.stock;
      if (stock <= 0) {
        hasUpdates = true;
        return false;
      }

      if (item.quantity > stock) {
        item.quantity = stock;
        hasUpdates = true;
      }
      return true;
    });

    if (hasUpdates) {
      await cart.save(); 
    }

    
    const updatedItems = await Promise.all(
      cart.items.map(async (item) => {
        const pricing = await calculateBestOffer(item.productId);
        return {
          ...item.toObject(),
          productId: {
            ...item.productId.toObject(),
            discountedPrice: pricing.discountedPrice,
            hasOffer: pricing.hasOffer,
            offer: pricing.offer,
          },
        };
      })
    );

    const subtotal = updatedItems.reduce((sum, item) => {
      const price = item.productId.hasOffer
        ? item.productId.discountedPrice
        : item.productId.price;
      return sum + price * item.quantity;
    }, 0);

    res.status(200).json({
      success: true,
      items: updatedItems,
      subtotal: subtotal,
      message: "Cart fetched successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// METHOD POST || Add product to cart for logged-in user
export const addToCart = async (req, res, next) => {
  const { productId, quantity } = req.body;
  const userId = req.user.id;
  try {
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    if (quantity > product.stock)
      return res
        .status(400)
        .json({ success: false, message: "Insufficient stock available." });
    const cart = await Cart.findOne({ userId, "items.productId": productId });
    if (cart) {
      const currentItem = cart.items.find(
        (item) => item.productId.toString() === productId.toString()
      );
      if (currentItem && currentItem.quantity + quantity > 5) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Cannot add more than 5 units of a product.",
          });
      }
      await Cart.findOneAndUpdate(
        { userId, "items.productId": productId },
        { $inc: { "items.$.quantity": quantity } },
        { new: true }
      );
    } else {
      if (quantity > 5)
        return res
          .status(400)
          .json({
            success: false,
            message: "Cannot add more than 5 units of a product.",
          });
      await Cart.updateOne(
        { userId },
        { $push: { items: { productId, quantity } } },
        { upsert: true }
      );
    }
    res
      .status(200)
      .json({ success: true, message: "Product added to cart successfully." });
  } catch (error) {
    next(error);
  }
};

// METHOD PATCH || Update product quantity in cart
export const modifyCartQuantity = async (req, res, next) => {
  const { productId, quantity } = req.body;
  const userId = req.user.id;
  try {
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart)
      return res
        .status(404)
        .json({ success: false, message: "Cart not found." });
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    const item = cart.items.find(
      (item) => item.productId && item.productId._id.toString() === productId
    );
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Product not found in cart." });
    item.quantity = quantity;
    await cart.save();
    res
      .status(200)
      .json({
        success: true,
        message: "Cart updated successfully.",
        productStock: product.stock,
      });
  } catch (error) {
    next(error);
  }
};

// METHOD DELETE || Remove product from cart
export const removeFromCart = async (req, res, next) => {
  const userId = req.user.id;
  const { productId } = req.body;
  try {
    // Fetch the cart along with product details
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found." });
    }

    // Find the index of the item to remove
    const itemIndex = cart.items.findIndex(
      (item) => item.productId._id.toString() === productId
    );
    if (itemIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in cart." });
    }

    cart.items.splice(itemIndex, 1);

    const updatedItems = await Promise.all(
      cart.items.map(async (item) => {
        const pricing = await calculateBestOffer(item.productId);
        return {
          ...item.toObject(),
          productId: {
            ...item.productId.toObject(),
            discountedPrice: pricing.discountedPrice,
            hasOffer: pricing.hasOffer,
            offer: pricing.offer,
          },
        };
      })
    );

    const totalAmount = updatedItems.reduce((sum, item) => {
      const priceToUse = item.productId.hasOffer
        ? item.productId.discountedPrice
        : item.productId.price;
      return sum + priceToUse * item.quantity;
    }, 0);

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Product removed from cart successfully.",
      totalAmount,
    });
  } catch (error) {
    next(error);
  }
};

// _______________________________________________________________________//
