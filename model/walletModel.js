import mongoose from "mongoose";

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  balance: {
    type: Number,
    default: 0,
  },
  transactions: [
    {
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
      transactionDate: {
        type: Date,
        required: true,
        default: Date.now,
      },
      transactionType: {
        type: String,
        enum: ["debit", "credit"],
        required: true,
      },
      transactionStatus: {
        type: String,
        enum: ["pending", "completed", "failed"],
        required: true,
      },
      amount: {
        type: Number,
        required: true,
      },
      description: {
        type: String,
      },
    },
  ],
});

const Wallet = mongoose.model("Wallet", walletSchema);

export default Wallet;
 