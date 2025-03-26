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
      console.log("No products found in order.");
      return res.status(400).json({ message: "No products in order." });
    }

    const validPaymentMethods = ["COD", "Razorpay", "Wallet"];
    if (!validPaymentMethods.includes(paymentMethod)) {
      console.log("Invalid payment method:", paymentMethod);
      return res.status(400).json({
        message: `Invalid payment method. Must be one of: ${validPaymentMethods.join(
          ", "
        )}`,
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

      discountAmount = (totalAmount * couponUsed.discount) / 100;

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
        discount: discountAmount || 0,
        couponDeduction: 0,
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
    next(error);
  }
};

// _______________________________________________________________________//