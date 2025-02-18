import mongoose from "mongoose";
import Order from "../model/orderModel.js";
import Product from "../model/productModel.js";
import Wallet from "../model/walletModel.js";
import SalesReport from "../model/salesModel.js";
// _______________________________________________________________________//

// =========================== ADMIN CONTROLLERS ===========================
// METHOD GET || Get all orders with detailed information
export const getAllOrdersAdmin = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const totalOrders = await Order.countDocuments();
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

    res.status(200).json({ orders: processedOrders, totalOrders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    next(error);
  }
};

// METHOD PUT || Update order item status
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId, productId } = req.params;
    const { status } = req.body;
    const validStatuses = ["Pending", "Shipped", "Delivered", "Cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Find the index of the product in the order's products array
    const productIndex = order.products.findIndex(
      (p) =>
        p.productId.toString() ===
        new mongoose.Types.ObjectId(productId).toString()
    );

    if (productIndex === -1) {
      return res.status(404).json({ message: "Product not found in order" });
    }

    // Update the product status
    order.products[productIndex].status = status;

    // If delivered, set the delivery date
    if (status === "Delivered") {
      order.products[productIndex].deliveryDate = new Date();
    }

    // If cancelled, update wallet balance if payment method is not COD
    if (status === "Cancelled") {
      if (order.paymentMethod !== "COD") {
        // Fetch product details to access discountedPrice
        const productData = await Product.findById(productId);
        if (productData) {
          const refundAmount =
            productData.discountedPrice * order.products[productIndex].quantity;
          let userWallet = await Wallet.findOne({ user: order.userId });
          if (!userWallet) {
            userWallet = new Wallet({ user: order.userId, balance: 0 });
          }
          userWallet.balance += Number(refundAmount);
          await userWallet.save();
        }
      }
      // If every product in the order is cancelled, update order status as well
      if (order.products.every((p) => p.status === "Cancelled")) {
        order.status = "Cancelled";
      }
    }

    // If every product is delivered, update the order status and set order delivery date
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

// METHOD PATCH || Handle product return requests
export const handleReturnRequest = async (req, res, next) => {
  try {
    const { orderId, productId } = req.params;
    const { action } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const productIndex = order.products.findIndex(
      (p) => p.productId.toString() === productId.toString()
    );

    if (productIndex === -1) {
      return res.status(404).json({ message: "Product not found in order" });
    }

    if (order.products[productIndex].status !== "Return Pending") {
      return res
        .status(400)
        .json({ message: "Product not in return pending state" });
    }

    if (action === "approve") {
      order.products[productIndex].status = "Return Approved";
      if(order.paymentMethod !== "COD"){
        const product = order.products[productIndex];
        const totalAmount = product.productPrice * product.quantity;
        console.log(totalAmount)
  
        await Wallet.findOneAndUpdate(
          { user: order.userId },
          {
            $inc: { balance: totalAmount },
            $push: {
              transactions: {
                transactionDate: new Date(),
                transactionType: "credit",
                transactionStatus: "completed",
                amount: totalAmount,
              },
            },
          },
          { new: true, upsert: true }
        );
      }
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

// =========================== USER CONTROLLERS ============================
// METHOD GET || Get user's order history
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

// METHOD PATCH || Initiate product return process
export const initiateReturn = async (req, res, next) => {
  try {
    const { orderId, productId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const productIndex = order.products.findIndex(
      (p) => p.productId.toString() === productId
    );

    if (productIndex === -1) {
      return res.status(404).json({ message: "Product not found in order" });
    }

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

// =========================== COMMON CONTROLLERS ==========================
// METHOD PATCH || Cancel order item
export const cancelOrderItem = async (req, res, next) => {
  try {
    const { orderId, productId } = req.params;

    const order = await Order.findById(orderId).populate("products.productId");
    if (!order) return res.status(404).json({ message: "Order not found" });

    console.log(order)
    const product = order.products.find(
      (p) => p.productId && p.productId._id.toString() === productId
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found in order" });
    }

    if (product.status === "Cancelled") {
      return res.status(400).json({ message: "Product already cancelled" });
    }

    product.status = "Cancelled";

    if (order.products.every((p) => p.status === "Cancelled")) {
      order.status = "Cancelled";
    }

    if(order.paymentMethod !== 'COD'){
      let userWallet = await Wallet.findOne({ user: order.userId });
      if (!userWallet) {
        userWallet = new Wallet({ user: order.userId, balance: 0 });
      }
      console.log('hiiiii',product)
      const refundAmount = product.productId.discountedPrice * product.quantity;
      userWallet.balance += Number(refundAmount);
      await userWallet.save();}
    await order.save();

    await SalesReport.updateOne(
      { orderId },
      { $set: { deliveryStatus: "Cancelled" } }
    );

    res.json({
      message: "Product cancelled and amount added to wallet",
      order
    });
  } catch (error) {
    console.error("Error cancelling product:", error);
    next(error);
  }
};
// _______________________________________________________________________//
