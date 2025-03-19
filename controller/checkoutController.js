import mongoose from "mongoose";
import Cart from "../model/cartModel.js";
import Order from "../model/orderModel.js";
import Product from "../model/productModel.js";
import Wallet from "../model/walletModel.js";
import { calculateBestOffer } from "../utils/calculateBestOffer.js";
import SalesReport from "../model/salesModel.js";
import Coupon from "../model/couponModel.js";
// _______________________________________________________________________//

// =============================== USER CONTROLLERS ===============================
// METHOD GET || Fetch cart items for checkout

const mapCartItemWithPricing = async (item) => {
  const pricing = await calculateBestOffer(item.productId);
  const discountedPrice = pricing.hasOffer
    ? pricing.discountedPrice
    : item.productId.price;

  return {
    ...item.toObject(),
    effectivePrice: discountedPrice,
    hasOffer: pricing.hasOffer,
    discountedPrice: pricing.discountedPrice,
    offer: pricing.offer,
    productId: {
      ...item.productId.toObject(),
      discountedPrice,
    },
  };
};

export const getCartItems = async (req, res, next) => {
  const userId = req.user.id;
  try {
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) {
      return res.status(200).json({
        items: [],
        totalAmount: 0,
        message: "No products in cart to order.",
      });
    }

    const validItems = cart.items.filter(
      (item) => item.productId && item.productId.stock > 0
    );

    const updatedItems = await Promise.all(
      validItems.map(mapCartItemWithPricing)
    );

    const totalQuantity = updatedItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    const totalAmount = updatedItems.reduce(
      (sum, item) => sum + item.effectivePrice * item.quantity,
      0
    );

    const originalPrice = updatedItems.reduce(
      (sum, item) => sum + item.productId.price * item.quantity,
      0
    );

    res.status(200).json({
      items: updatedItems,
      total: totalAmount,
      originalPrice,
      totalQuantity,
      message:
        updatedItems.length > 0
          ? "Products fetched successfully."
          : "No in-stock items in the cart.",
    });
  } catch (error) {
    next(error);
  }
};

// METHOD POST || Process checkout order
export const checkoutOrderSuccess = async (req, res, next) => {
  try {
    const {
      products,
      paymentMethod,
      addressId,
      couponCode,
      totalAmount,
      paymentStatus,
    } = req.body;

    const userId = req.user.id;

    if (!products?.length) {
      return res.status(400).json({ message: "No products in order." });
    }
    const validPaymentMethods = ["COD", "Razorpay", "Wallet"];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        message: `Invalid payment method. Must be one of: ${validPaymentMethods.join(
          ", "
        )}`,
      });
    }

    if (paymentMethod === "COD" && totalAmount > 1000) {
      return res.status(400).json({
        message: "Cash on Delivery is not available for orders above ₹1000.",
      });
    }

    const processedProducts = await Promise.all(
      products.map(async (item) => {
        const product = await Product.findById(item.productId)
          .populate("category brand") // Add population
          .lean();
        if (!product) {
          throw new Error(`Product with id ${item.productId} not found.`);
        }

        // Validate stock availability
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product: ${product.name}`);
        }

        return {
          productId: item.productId,
          name: product.name,
          category: product.category.title,
          brand: product.brand.title,
          productPrice: item.productPrice,
          quantity: item.quantity,
        };
      })
    );

    if (paymentMethod === "Wallet") {
      const wallet = await Wallet.findOne({ user: userId });
    
      if (!wallet) {
        return res.status(400).json({
          message: "Wallet not found. Please add funds to proceed.",
        });
      }
    
      if (wallet.balance < totalAmount) {
        return res.status(400).json({
          message: "Insufficient wallet balance.",
        });
      }
    
      // Deduct the amount from the wallet
      wallet.balance -= totalAmount;
    
      // Add a transaction entry
      wallet.transactions.push({
        orderId: new mongoose.Types.ObjectId(), // Ensure you use the actual orderId later
        transactionDate: new Date(),
        transactionType: "debit",
        transactionStatus: "completed",
        amount: totalAmount,
        description: "Order payment using wallet",
      });
    
      await wallet.save(); // Save the updated wallet
    }
    

    await Promise.all(
      processedProducts.map((item) =>
        Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: -item.quantity },
        })
      )
    );

    let discountAmount = 0;
    let couponUsed = null;

    if (couponCode) {
      couponUsed = await Coupon.findOne({ code: couponCode.toUpperCase() });
      if (!couponUsed) {
        return res.status(400).json({ message: "Invalid coupon code." });
      }

      if (
        !couponUsed.isActive ||
        (couponUsed.expiryDate && new Date(couponUsed.expiryDate) < new Date())
      ) {
        return res.status(400).json({ message: "Coupon is not valid." });
      }

      if (totalAmount < couponUsed.minPurchaseAmount) {
        return res.status(400).json({
          message: `Minimum purchase amount for this coupon is ₹${couponUsed.minPurchaseAmount}.`,
        });
      }

      if (
        couponUsed.usageLimit !== null &&
        couponUsed.usageCount >= couponUsed.usageLimit
      ) {
        return res.status(400).json({ message: "Coupon fully redeemed." });
      }

      const userUsage = couponUsed.usedBy.find((entry) =>
        entry.userId.equals(userId)
      );
      if (
        couponUsed.usageLimitPerUser !== null &&
        userUsage &&
        userUsage.count >= couponUsed.usageLimitPerUser
      ) {
        return res.status(400).json({ message: "Coupon usage limit reached." });
      }

      // Calculate discount
      discountAmount = (totalAmount * couponUsed.discount) / 100;

      // Update coupon usage
      couponUsed.usageCount += 1;
      if (couponUsed.usageLimitPerUser !== null) {
        if (userUsage) {
          userUsage.count += 1;
        } else {
          couponUsed.usedBy.push({ userId, count: 1 });
        }
      }
      await couponUsed.save();
    }

    const order = await Order.create({
      addressId,
      paymentMethod,
      products: processedProducts,
      userId,
      totalAmount: totalAmount,
      status: "Pending",
      paymentStatus: paymentStatus || "Pending",
      couponCode: couponCode || null,
    });

    const c = await SalesReport.create({
      orderId: order._id,
      addressId: req.body.addressId,
      couponCode: req.body.couponCode || null,
      couponId: req.body.couponId || null,
      product: processedProducts.map((item) => ({
        productId: item.productId,
        productName: item.name,
        category: item.category, // Ensure this matches your Product schema
        brand: item.brand,
        quantity: item.quantity,
        unitPrice: item.productPrice,
        totalPrice: item.productPrice * item.quantity,
        discount: item.discount,
        couponDeduction: 0,
      })),
      finalAmount: req.body.totalAmount,
      orderDate: new Date(),
      customer: userId,
      paymentMethod,
      deliveryStatus: "Pending",
    });

    console.log("c:   ", c);

    await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });
    return res.status(201).json({
      success: true,
      message: "Order placed successfully.",
      order,
      totalAmount: totalAmount,
    });
  } catch (error) {
    next(error);
  }
};

export const retryPayment = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { paymentMethod } = req.body;
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    let paymentSuccess = false;

    switch (paymentMethod) {
      case "Razorpay":
        return res.status(200).json({
          amount: order.totalAmount,
          currency: "INR",
        });

      case "Wallet":
        let wallet = await Wallet.findOne({ user: userId });

        if (!wallet || wallet.balance < order.totalAmount) {
          return res.status(400).json({ message: "Insufficient balance" });
        }

        // Deduct the amount and record the transaction
        const updatedWallet = await Wallet.findOneAndUpdate(
          { user: userId },
          {
            $inc: { balance: -order.totalAmount },
            $push: {
              transactions: {
                amount: order.totalAmount,
                transactionType: "debit",
                transactionStatus: "completed",
                timestamp: new Date(),
              },
            },
          },
          { new: true } // This ensures you get the updated document
        );

        if (!updatedWallet) {
          return res.status(500).json({ message: "Wallet update failed" });
        }
        paymentSuccess = true;
        break;

      case "COD":
        if (order.totalAmount > 1000) {
          return res.status(400).json({
            message:
              "Cash on Delivery is not available for orders above ₹1000.",
          });
        }
        paymentSuccess = true;
        break;

      default:
        return res.status(400).json({ message: "Invalid method" });
    }

    if (paymentSuccess) {
      order.paymentStatus = "Success";
      await order.save();
      return res.json({ success: true, order });
    }

    res.status(400).json({ message: "Payment failed" });
  } catch (error) {
    next(error);
  }
};

// Add to orderController.js
export const updateOrderPaymentStatus = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { paymentStatus: req.body.paymentStatus },
      { new: true }
    );
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
};
// _______________________________________________________________________//
