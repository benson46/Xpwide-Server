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
    console.log('req:body:  ', req.body);
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
      console.log("No products found in order.");
      return res.status(400).json({ message: "No products in order." });
    }

    const validPaymentMethods = ["COD", "Razorpay", "Wallet"];
    if (!validPaymentMethods.includes(paymentMethod)) {
      console.log("Invalid payment method:", paymentMethod);
      return res.status(400).json({
        message: `Invalid payment method. Must be one of: ${validPaymentMethods.join(", ")}`,
      });
    }

    if (paymentMethod === "COD" && totalAmount > 1000) {
      console.log("COD not allowed for orders above ₹1000.");
      return res.status(400).json({
        message: "Cash on Delivery is not available for orders above ₹1000.",
      });
    }

    const processedProducts = await Promise.all(
      products.map(async (item) => {
        const product = await Product.findById(item.productId)
          .populate("category brand")
          .lean();

        if (!product) {
          throw new Error(`Product with id ${item.productId} not found.`);
        }

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

    // Compute realPrice from processed products to prevent client manipulation
    const computedRealPrice = processedProducts.reduce(
      (sum, item) => sum + item.productPrice * item.quantity,
      0
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

      wallet.balance -= totalAmount;
      wallet.transactions.push({
        orderId: new mongoose.Types.ObjectId(),
        transactionDate: new Date(),
        transactionType: "debit",
        transactionStatus: "completed",
        amount: totalAmount,
        description: "Order payment using wallet",
      });

      await wallet.save();
    }

    if (paymentStatus === "Completed") {
      await Promise.all(
        processedProducts.map((item) =>
          Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: -item.quantity },
          })
        )
      );
    }

    let couponUsed = null;
    let discountAmount = 0;
    let couponDeductions = [];
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

      if (computedRealPrice < couponUsed.minPurchaseAmount) {
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

      discountAmount = (computedRealPrice * couponUsed.discount) / 100;

      // Calculate coupon deduction for each product
      processedProducts.forEach((item) => {
        const itemTotal = item.productPrice * item.quantity;
        const itemDiscount = (itemTotal / computedRealPrice) * discountAmount;
        item.couponDeduction = parseFloat(itemDiscount.toFixed(2));
      });

      // Adjust for rounding discrepancies
      const totalDeduction = processedProducts.reduce(
        (sum, item) => sum + item.couponDeduction,
        0
      );
      const discrepancy = discountAmount - totalDeduction;
      if (discrepancy !== 0) {
        processedProducts[processedProducts.length - 1].couponDeduction +=
          discrepancy;
        processedProducts[processedProducts.length - 1].couponDeduction =
          parseFloat(
            processedProducts[processedProducts.length - 1].couponDeduction.toFixed(2)
          );
      }

      couponUsed.usageCount += 1;
      if (couponUsed.usageLimitPerUser !== null) {
        if (userUsage) {
          userUsage.count += 1;
        } else {
          couponUsed.usedBy.push({ userId, count: 1 });
        }
      }
      await couponUsed.save();
    } else {
      // No coupon applied, set couponDeduction to 0 for all products
      processedProducts.forEach((item) => (item.couponDeduction = 0));
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

    const salesReport = await SalesReport.create({
      orderId: order._id,
      addressId: addressId,
      couponCode: couponCode || null,
      product: processedProducts.map((item) => ({
        productId: item.productId,
        productName: item.name,
        category: item.category,
        brand: item.brand,
        quantity: item.quantity,
        unitPrice: item.productPrice,
        totalPrice: item.productPrice * item.quantity,
        discount: item.couponDeduction || 0,
        couponDeduction: item.couponDeduction || 0,
      })),
      finalAmount: totalAmount,
      orderDate: new Date(),
      customer: userId,
      paymentMethod,
      deliveryStatus: "Pending",
    });

    await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully.",
      order,
      totalAmount: totalAmount,
    });
  } catch (error) {
    console.error("Error during checkout:", error);
    next(error);
  }
};


export const retryPayment = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { paymentMethod } = req.body;
    const { orderId } = req.params;


    const order = await Order.findById(orderId).populate("products.productId");
    if (!order) {
      console.error("Order not found");
      return res.status(404).json({ message: "Order not found" });
    }

    for (const item of order.products) {
      const product = item.productId;
      if (product.stock < item.quantity) {
        console.error(`Insufficient stock for product ${product.name}`);
        return res.status(400).json({
          message: `Insufficient stock for product ${product.name}`,
        });
      }
    }

    let paymentSuccess = false;

    switch (paymentMethod) {
      case "Razorpay":
        paymentSuccess = true;
        break;

      case "Wallet":
        let wallet = await Wallet.findOne({ user: userId });

        if (!wallet) {
          console.error("Wallet not found");
          return res.status(400).json({ message: "Wallet not found" });
        }

        if (wallet.balance < order.totalAmount) {
          console.error("Insufficient wallet balance");
          return res.status(400).json({ message: "Insufficient balance" });
        }

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
          { new: true }
        );

        if (!updatedWallet) {
          console.error("Wallet update failed");
          return res.status(500).json({ message: "Wallet update failed" });
        }

        paymentSuccess = true;
        break;

      case "COD":
        if (order.totalAmount > 1000) {
          console.warn("COD not available for orders above ₹1000.");
          return res.status(400).json({
            message: "Cash on Delivery is not available for orders above ₹1000.",
          });
        }
        paymentSuccess = true;
        break;

      default:
        console.error("Invalid payment method");
        return res.status(400).json({ message: "Invalid method" });
    }

    if (paymentSuccess) {
      try {
        const updateOperations = order.products.map((item) => ({
          updateOne: {
            filter: { _id: item.productId._id },
            update: { $inc: { stock: -item.quantity } },
            options: { runValidators: true }, // Enforce stock validation
          },
        }));

        await Product.bulkWrite(updateOperations);
        order.paymentStatus = "Success";
        await order.save();

        return res.json({ success: true, order });
      } catch (error) {
        console.error("Error updating product stock:", error);
        return res.status(500).json({ message: "Failed to update product stock" });
      }
    }

    console.error("Payment failed");
    res.status(400).json({ message: "Payment failed" });
  } catch (error) {
    console.error("Error in retryPayment:", error);
    next(error);
  }
};

// _______________________________________________________________________//