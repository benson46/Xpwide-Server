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
    console.log(originalPrice);

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
    console.log(req.body)
    const { products, paymentMethod, addressId,couponCode,couponId } = req.body;
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

const processedProducts = await Promise.all(
  products.map(async (item) => {
    const product = await Product.findById(item.productId);
    if (!product) {
      throw new Error(`Product with id ${item.productId} not found.`);
    }
    
    // Validate stock availability
    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for product: ${product.name}`);
    }
    
    // Directly use the productPrice from the frontend
    const price = item.productPrice;
    
    return {
      productId: item.productId,
      name: product.name,
      productPrice: price,
      quantity: item.quantity,
      price,              // Final price for the product
      discount: 0,        // No additional discount calculation here
    };
  })
);

const recalculatedTotalAmount = req.body.totalAmount;


    if (paymentMethod === "Wallet") {
      const wallet = await Wallet.findOne({ user: userId });
      if (!wallet?.balance || wallet.balance < recalculatedTotalAmount) {
        return res
          .status(400)
          .json({ message: "Insufficient wallet balance." });
      }

      await Wallet.findOneAndUpdate(
        { user: userId },
        {
          $inc: { balance: -recalculatedTotalAmount },
          $push: {
            transactions: {
              orderId: new mongoose.Types.ObjectId(),
              transactionDate: new Date(),
              transactionType: "debit",
              transactionStatus: "completed",
              amount: recalculatedTotalAmount,
              description: `Paid ₹${recalculatedTotalAmount} for order`,
            },
          },
        },
        { new: true, runValidators: true }
      );
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

      // Re-validate coupon
      if (
        !couponUsed.isActive ||
        (couponUsed.expiryDate && new Date(couponUsed.expiryDate) < new Date())
      ) {
        return res.status(400).json({ message: "Coupon is not valid." });
      }

      if (recalculatedTotalAmount < couponUsed.minPurchaseAmount) {
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
      discountAmount = (recalculatedTotalAmount * couponUsed.discount) / 100;
      if (couponUsed.maxDiscount && discountAmount > couponUsed.maxDiscount) {
        discountAmount = couponUsed.maxDiscount;
      }

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

    const newTotal = recalculatedTotalAmount - discountAmount;


    const order = await Order.create({
      addressId,
      paymentMethod,
      products: processedProducts,
      userId,
      totalAmount: newTotal,
      status: "Pending",
      couponCode: couponCode || null,
    });

    await SalesReport.create({
      orderId: order._id,
      addressId: req.body.addressId,         // Include address ID from the frontend
      couponCode: req.body.couponCode || null, // Include coupon code if provided
      couponId: req.body.couponId || null,     // Include coupon ID if provided
      products: processedProducts.map((item) => ({
        productId: item.productId,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.originalPrice,                // Use originalPrice from frontend as the unit price
        totalPrice: item.originalPrice * item.quantity, // Calculate total price per product
        discount: item.discount,
        couponDeduction: 0, // Adjust this if coupon deductions need to be applied per product
      })),
      finalAmount: req.body.totalAmount, // Use totalAmount from the frontend
      orderDate: new Date(),
      customer: userId,
      paymentMethod,
      deliveryStatus: "Pending",
    });
    

    await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });
    return res.status(201).json({
      message: "Order placed successfully.",
      order,
      totalAmount: recalculatedTotalAmount,
    });
  } catch (error) {
    next(error);
  }
};

// _______________________________________________________________________//
