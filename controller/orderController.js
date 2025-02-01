import Order from "../model/orderModel.js";
import Product from "../model/proudctModel.js";

//------------------------------------------ ADMIN CONTROLLES --------------------------------------------------------------

// METHOD GET || GET ALL ORDER DETIALS
export const getAllOrdersAdmin = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate("userId", "firstName lastName email")
      .populate("addressId")
      .populate("products.productId")
      .sort({ createdAt: -1 });

    const processedOrders = orders.map((order) => ({
      _id: order._id,
      customerName: `${order.userId?.firstName || "Unknown"} ${
        order.userId?.lastName || ""
      }`,
      customerEmail: order.userId?.email || "Unknown",
      address: `${order.addressId?.address}, ${order.addressId?.city}, ${order.addressId?.state} - ${order.addressId?.pincode}`,
      products: order.products.map((p) => ({
        productId: p.productId._id,
        name: p.productId.name,
        price: p.productId.price,
        image: p.productId.image,
        quantity: p.quantity,
        status: p.status,
      })),
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt,
    }));

    res.json(processedOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    next(error);
  }
};

// METHOD PUT || UPDATE ORDER DETIALS - SHIPPED,DELIVERED ETC..
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { productId, status } = req.body;
    const validStatuses = ["Pending", "Shipped", "Delivered", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const productIndex = order.products.findIndex(
      (p) => p.productId.toString() === productId
    );
    if (productIndex === -1)
      return res.status(404).json({ message: "Product not found in order" });

    order.products[productIndex].status = status;

    if (status === "Delivered") {
      order.products[productIndex].deliveryDate = new Date();
    }

    console.log(order.products[productIndex].deliveryDate);

    if (order.products.every((p) => p.status === "Delivered")) {
      order.status = "Delivered";
      order.deliveryDate = new Date();
      console.log("deliverydate: ", order.deliveryDate);
    }

    await order.save();
    res.json({ message: "Product status updated", order });
  } catch (error) {
    console.error("Error updating order status:", error);
    next(error);
  }
};

//-----------------------------------------  COMMON CONTROLLES ---------------------------------------------------------------

// METHOD PATCH || CANCEL PRODUCT
export const cancelOrderItem = async (req, res, next) => {
  try {
    console.log('hi')
    const { orderId, productId } = req.params;
    console.log(productId);

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const productIndex = order.products.findIndex(
      (p) => p.productId.toString() === productId
    );
    if (productIndex === -1)
      return res.status(404).json({ message: "Product not found in order" });

    if (order.products[productIndex].status === "Cancelled") {
      return res.status(400).json({ message: "Product is already cancelled" });
    }

    order.products[productIndex].status = "Cancelled";

    if (order.products.every((p) => p.status === "Cancelled")) {
      order.status = "Cancelled";
    }

    await order.save();

    res.json({ message: "Product cancelled successfully", order });
  } catch (error) {
    console.error("Error cancelling product:", error);
    next(error);
  }
};

//-----------------------------------------  USER CONTROLLES ---------------------------------------------------------------

// METHOD GET || CANCEL PRODUCT
export const getAllOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const orders = await Order.find({ userId })
      .populate("addressId")
      .sort({ createdAt: -1 });

    const processedOrders = await Promise.all(
      orders.map(async (order) => {
        const groupedProducts = {};

        for (const product of order.products) {
          const productDetails = await Product.findById(product.productId);
          if (productDetails) {
            if (groupedProducts[product.productId]) {
              groupedProducts[product.productId].quantity += product.quantity;
            } else {
              groupedProducts[product.productId] = {
                ...productDetails.toObject(),
                quantity: product.quantity,
                status: product.status,
                deliveryDate: product.deliveryDate || null,
              };
            }
          }
        }

        return {
          ...order.toObject(),
          products: Object.values(groupedProducts),
        };
      })
    );

    res.json(processedOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    next(error);
  }
};

//--------------------------------------------------------------------------------------------------------

/* return order (start from here)
export const returnOrderItem = async (req, res, next) => {
  try {
    const { orderId, productId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const productIndex = order.products.findIndex(
      (p) => p.productId.toString() === productId
    );
    if (productIndex === -1) return res.status(404).json({ message: "Product not found in order" });

    if (order.products[productIndex].status === "Returned") {
      return res.status(400).json({ message: "Product is already returned" });
    }

    order.products[productIndex].status = "Returned";

    if (order.products.every((p) => p.status === "Returned")) {
      order.status = "Returned";
    }

    await order.save();

    res.json({ message: "Product return initiated successfully", order });
  } catch (error) {
    console.error("Error returning product:", error);
    next(error);
  }
};
*/
