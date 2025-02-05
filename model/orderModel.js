import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    addressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "Razorpay", "Wallet"],
      required: true,
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        status: {
          type: String,
          enum: [
            "Pending",
            "Shipped",
            "Delivered",
            "Cancelled",
            "Return Pending",
            "Return Approved",
            "Return Rejected",
          ],
          default: "Pending",
        },
        deliveryDate: {
          type: Date,
          default: null,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
