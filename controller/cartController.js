import Cart from "../model/cartModel.js";
import Product from "../model/proudctModal.js";

export const getCartProducts = async (req, res) => {
    const userId = req.user.id; // Retrieved from verified token
  
    try {
      const cart = await Cart.findOne({ userId }).populate("items.productId");
  
      if (!cart) {
        return res
          .status(200)
          .json({ items: [], totalAmount: 0, message: "Cart is empty" });
      }
  
      // Filter out items with out-of-stock products
      const validItems = cart.items.filter((item) => item.productId.stock > 0);
  
      // Calculate the total amount only for in-stock products
      const totalAmount = validItems.reduce((sum, item) => {
        return sum + item.productId.price * item.quantity;
      }, 0);
  
      res.status(200).json({
        items: cart.items,
        subtotal: totalAmount,
        message: validItems.length > 0 ? "Cart fetched successfully" : "No in-stock items in the cart",
      });
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
  

export const addToCart = async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.user.id; // Retrieved from verified token

  try {
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (quantity > product.stock) {
      return res.status(400).json({ message: "Insufficient stock available" });
    }

    // Find the cart and the item with the productId
    const cart = await Cart.findOne({ userId, "items.productId": productId });

    if (cart) {
      // Find the current quantity of the product in the cart
      const currentItem = cart.items.find(
        (item) => item.productId.toString() === productId.toString()
      );
      const currentQuantity = currentItem ? currentItem.quantity : 0;

      // Check if adding the new quantity would exceed the maximum limit of 5
      if (currentQuantity + quantity > 5) {
        return res
          .status(400)
          .json({ message: "Cannot add more than 5 products to the cart" });
      }

      // Update the quantity if the limit is not exceeded
      await Cart.findOneAndUpdate(
        { userId, "items.productId": productId },
        { $inc: { "items.$.quantity": quantity } },
        { new: true }
      );
    } else {
      // If the cart or item doesn't exist, create a new entry
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
    console.error("Error adding product to cart:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update product quantity in the cart
export const updateCartQuantity = async (req, res) => {
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
      (item) => item.productId._id.toString() === productId
    );

    if (!item) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    // Validate and update the quantity
    item.quantity = quantity;

    // Recalculate the totalAmount (subtotal)
    cart.totalAmount = cart.items.reduce(
      (sum, item) => sum + item.productId.price * item.quantity,
      0
    );

    await cart.save();

    res
      .status(200)
      .json({
        message: "Cart updated successfully",
        cart,
        subtotal: cart.totalAmount,
      });
  } catch (error) {
    console.error("Error updating cart quantity:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Remove product from the cart
export const removeFromCart = async (req, res) => {
  const { productId } = req.body;
  const userId = req.user.id; // Retrieved from verified token

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

    // Remove item from cart
    cart.items.splice(itemIndex, 1);
    await cart.save();

    res.status(200).json({ message: "Product removed from cart successfully" });
  } catch (error) {
    console.error("Error removing product from cart:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Fetch cart subtotal
export const getCartSubtotal = async (req, res) => {
  const userId = req.user.id; // Retrieved from verified token

  try {
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart) {
      return res.status(200).json({ subtotal: 0, message: "Cart is empty" });
    }

    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.productId.price * item.quantity,
      0
    );

    res.status(200).json({ subtotal });
  } catch (error) {
    console.error("Error fetching cart subtotal:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// "Buy All" functionality
export const buyAll = async (req, res) => {
  const userId = req.user.id; // Retrieved from verified token

  try {
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    for (const item of cart.items) {
      const product = item.productId;

      // Check stock
      if (item.quantity > product.stock) {
        return res
          .status(400)
          .json({ message: `Insufficient stock for ${product.name}` });
      }

      // Deduct stock
      product.stock -= item.quantity;
      await product.save();
    }

    // Clear the cart after purchase
    cart.items = [];
    await cart.save();

    res.status(200).json({ message: "Purchase successful!" });
  } catch (error) {
    console.error("Error processing purchase:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
