import Cart from "../model/cartModel.js";
import Product from "../model/proudctModel.js";

//--------------------------------------------------------------------------------------------------------

// METHOD GET || Show all products in cart for logged-in user
export const getCartProducts = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart) {
      return res
        .status(200)
        .json({ items: [], totalAmount: 0, message: "Cart is empty" });
    }

    const validItems = cart.items.filter((item) => item.productId.stock > 0);

    const totalAmount = validItems.reduce((sum, item) => {
      return sum + item.productId.price * item.quantity;
    }, 0);

    res.status(200).json({
      items: cart.items,
      subtotal: totalAmount,
      message:
        validItems.length > 0
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
  console.log(quantity);
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

    item.quantity = quantity;

    cart.totalAmount = cart.items.reduce(
      (sum, item) => sum + item.productId.price * item.quantity,
      0
    );

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
