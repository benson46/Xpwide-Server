import Cart from "../model/cartModel.js";

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
