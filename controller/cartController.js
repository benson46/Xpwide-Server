import Cart from "../model/cartModel.js";
import Product from "../model/proudctModel.js";
import { calculateBestOffer } from "../utils/calculateBestOffer.js"; // adjust the path as needed

//--------------------------------------------------------------------------------------------------------

// METHOD GET || Show all products in cart for logged-in user
export const getCartProducts = async (req, res, next) => {
  const userId = req.user.id;

  try {
    // Populate items with product details
    let cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart) {
      return res
        .status(200)
        .json({ items: [], totalAmount: 0, message: "Cart is empty" });
    }

    // Filter items that are in stock
    const validItems = cart.items.filter((item) => item.productId.stock > 0);

    // Recalculate pricing for each valid item using calculateBestOffer
    const updatedItems = await Promise.all(
      validItems.map(async (item) => {
        // Calculate best offer for the product in the cart
        const pricing = await calculateBestOffer(item.productId);
        // Update the product details with the calculated pricing
        const updatedProduct = {
          ...item.productId.toObject(),
          discountedPrice: pricing.discountedPrice,
          hasOffer: pricing.hasOffer,
          offer: pricing.offer,
        };
        return {
          ...item.toObject(),
          productId: updatedProduct,
        };
      })
    );

    // Calculate the total amount using the discounted price if available
    const totalAmount = updatedItems.reduce((sum, item) => {
      const product = item.productId;
      // Use discounted price if an offer is active; otherwise use original price
      const priceToUse = product.hasOffer ? product.discountedPrice : product.price;
      return sum + priceToUse * item.quantity;
    }, 0);

    res.status(200).json({
      items: updatedItems,
      subtotal: totalAmount,
      message:
        updatedItems.length > 0
          ? "Cart fetched successfully"
          : "No in-stock items in the cart",
    });
  } catch (error) {
    next(error);
  }
};

// METHOD POST || Add new products to cart for logged-in user
export const addToCart = async (req, res, next) => {
  const { productId, quantity } = req.body;
  const userId = req.user.id;

  try {
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (quantity > product.stock) {
      return res.status(400).json({ message: "Insufficient stock available" });
    }

    const cart = await Cart.findOne({ userId, "items.productId": productId });

    if (cart) {
      const currentItem = cart.items.find(
        (item) => item.productId.toString() === productId.toString()
      );
      const currentQuantity = currentItem ? currentItem.quantity : 0;

      if (currentQuantity + quantity > 5) {
        return res
          .status(400)
          .json({ message: "Cannot add more than 5 products to the cart" });
      }

      await Cart.findOneAndUpdate(
        { userId, "items.productId": productId },
        { $inc: { "items.$.quantity": quantity } },
        { new: true }
      );
    } else {
      if (quantity > 5) {
        return res
          .status(400)
          .json({ message: "Cannot add more than 5 products to the cart" });
      }

      await Cart.updateOne(
        { userId },
        { $push: { items: { productId, quantity } } },
        { upsert: true }
      );
    }

    res.status(200).json({ message: "Product added to cart successfully" });
  } catch (error) {
    next(error);
  }
};

// METHOD PATCH || Update product quantity in the cart
export const updateCartQuantity = async (req, res, next) => {
  const { productId, quantity } = req.body;
  const userId = req.user.id;

  try {
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const item = cart.items.find(
      (item) => item.productId && item.productId._id.toString() === productId
    );

    if (!item) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    // Update the quantity
    item.quantity = quantity;

    // Recalculate totalAmount safely:
    cart.totalAmount = cart.items.reduce((sum, item) => {
      // Ensure productId exists and that price is a number; otherwise, use 0.
      const price = item.productId && item.productId.price
        ? Number(item.productId.price)
        : 0;
      return sum + price * item.quantity;
    }, 0);

    await cart.save();

    res.status(200).json({
      message: "Cart updated successfully",
      cart,
      subtotal: cart.totalAmount,
    });
  } catch (error) {
    next(error);
  }
};


// METHOD DELETE || Remove a product from the cart
export const removeFromCart = async (req, res, next) => {
  const { productId } = req.body;
  const userId = req.user.id;

  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    res.status(200).json({ message: "Product removed from cart successfully" });
  } catch (error) {
    next(error);
  }
};

//--------------------------------------------------------------------------------------------------------
