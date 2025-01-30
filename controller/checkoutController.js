import Cart from "../model/cartModel.js";
import Order from "../model/orderModel.js";
import Product from "../model/proudctModel.js"
export const getCartItems = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart) {
      return res
        .status(200)
        .json({
          items: [],
          totalAmount: 0,
          message: "No prodcuts in cart to order",
        });
    }
    const validItems = cart.items.filter((item) => item.productId.stock > 0);
    const totalQuantity = validItems.reduce((sum,item)=>{
        return sum + item.quantity 
    },0)


    const totalAmount = validItems.reduce((sum, item) => {
      return sum + item.productId.price * item.quantity;
    }, 0);

    res.status(200).json({
      items: cart.items,
      subtotal: totalAmount,
      quantity:totalQuantity,
      message:
        validItems.length > 0
          ? "Products fetched successfully"
          : "No in-stock items in the cart",
    });
  } catch (error) {
    next(error);
  }
};


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
      status:'Pending',
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
      await product.save(); 
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
