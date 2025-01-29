import Cart from "../model/cartModel.js";
import Order from "../model/orderModel.js";
import Product from "../model/proudctModal.js";

export const orderSuccess = async (req, res, next) => {
  try {
    const { addressId, paymentMethod, products, totalAmount } = req.body;
    const userId = req.user.id;
    if (!products || products.length === 0) {
      return res.status(400).json({ message: "No products in order" });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized user" });
    }

    const order = new Order({
      addressId,
      paymentMethod,
      products,
      userId,
      totalAmount,
    });

    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Product not found: ${item.productId}` });
      }

      if (product.stock < item.quantity) {
        return res
          .status(400)
          .json({ message: `Insufficient stock for product: ${product.name}` });
      }

      product.stock -= item.quantity; // Reduce stock
      await product.save(); // Save updated product
    }

    await order.save();

    const cart = await Cart.findOne({ userId });
    cart.items = [];
    await cart.save();

    res.status(201).json({ message: "Order placed successfully", order });
  } catch (error) {
    next(error);
  }
};
