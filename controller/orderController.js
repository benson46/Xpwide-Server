import Order from "../model/orderModel.js";
import Product from "../model/proudctModel.js";
import Wallet from "../model/walletModel.js";  

//------------------------------------------ ADMIN CONTROLS --------------------------------------------------------------

// METHOD GET || GET ALL ORDER DETAILS
export const getAllOrdersAdmin = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate("userId", "firstName lastName email")
      .populate("addressId")
      .populate("products.productId")
      .sort({ createdAt: -1 });

    const processedOrders = orders.map((order) => ({
      _id: order._id,
      customerName: `${order.addressId?.name || "Unknown"}`,
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

// METHOD PUT || UPDATE ORDER DETAILS - SHIPPED, DELIVERED, ETC..
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

    if (order.products.every((p) => p.status === "Delivered")) {
      order.status = "Delivered";
      order.deliveryDate = new Date();
    }

    await order.save();
    res.json({ message: "Product status updated", order });
  } catch (error) {
    console.error("Error updating order status:", error);
    next(error);
  }
};

// METHOD PATCH || APPROVE/RETURN REJECT (ADMIN SIDE)
export const handleReturnRequest = async (req, res, next) => {
  try {
    const { orderId, productId } = req.params;
    const { action } = req.body; // "approve" or "reject"

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const productIndex = order.products.findIndex(
      (p) => p.productId.toString() === productId.toString()
    );

    if (productIndex === -1)
      return res.status(404).json({ message: "Product not found in order" });

    if (order.products[productIndex].status !== "Return Pending") {
      return res
        .status(400)
        .json({ message: "Product is not in Return Pending state" });
    }

    if (action === "approve") {
      order.products[productIndex].status = "Return Approved";

      // Update Wallet: Credit the user's wallet with the return amount
      const product = order.products[productIndex];
      const totalAmount = product.price * product.quantity;

      const wallet = await Wallet.findOneAndUpdate(
        { user: order.userId },
        {
          $inc: { balance: totalAmount },
          $push: {
            transactions: {
              transaction_date: new Date(),
              transaction_type: "credit",
              transaction_status: "completed",
              amount: totalAmount,
            },
          },
        },
        { new: true, upsert: true }
      );
    } else if (action === "reject") {
      order.products[productIndex].status = "Return Rejected";
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    await order.save();
    res.json({ message: `Return request ${action}ed`, order });
  } catch (error) {
    console.error("Error handling return request:", error);
    next(error);
  }
};

//----------------------------------------- COMMON CONTROLS ---------------------------------------------------------------

// METHOD PATCH || CANCEL PRODUCT(for both admin and user)
export const cancelOrderItem = async (req, res, next) => {
  try {
    const { orderId, productId } = req.params;

    const order = await Order.findById(orderId).populate("products.productId"); 
    if (!order) return res.status(404).json({ message: "Order not found" });


    // Find the product within the order
    const product = order.products.find(
      (p) => p.productId && p.productId._id.toString() === productId
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found in order" });
    }

    if (product.status === "Cancelled") {
      return res.status(400).json({ message: "Product is already cancelled" });
    }

    // Update the product status to "Cancelled"
    product.status = "Cancelled";

    // Check if all products are cancelled
    if (order.products.every((p) => p.status === "Cancelled")) {
      order.status = "Cancelled";
    }

    // Update wallet if the product is cancelled
    const userWallet = await Wallet.findOne({ user: order.userId });
    if (!userWallet) {
      return res.status(404).json({ message: "User wallet not found" });
    }

    // Ensure price calculation is correct
    const productPrice = product.productId.price * product.quantity;
    userWallet.balance += productPrice;

    await userWallet.save(); // Save updated wallet

    // Save the order after cancellation
    await order.save();

    res.json({
      message: "Product cancelled successfully and amount added to wallet",
      order,
      userWallet,
    });
  } catch (error) {
    console.error("Error cancelling product:", error);
    next(error);
  }
};


//----------------------------------------- USER CONTROLS ---------------------------------------------------------------

// METHOD GET || GET ALL ORDER DETAILS (USER)
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

// METHOD PATCH || INITIATE RETURN REQUEST (USER SIDE)
export const initiateReturn = async (req, res, next) => {
  try {
    const { orderId, productId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const productIndex = order.products.findIndex(
      (p) => p.productId.toString() === productId
    );
    if (productIndex === -1)
      return res.status(404).json({ message: "Product not found in order" });

    if (order.products[productIndex].status !== "Delivered") {
      return res
        .status(400)
        .json({ message: "Product must be delivered to initiate return" });
    }

    order.products[productIndex].status = "Return Pending";
    await order.save();

    res.json({ message: "Return request initiated", order });
  } catch (error) {
    console.error("Error initiating return:", error);
    next(error);
  }
};
