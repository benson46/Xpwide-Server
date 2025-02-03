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
        ref: "order",
      },
      transactionDate: {
        type: Date,
        required: true,
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
    },
  ],
});

const Wallet = mongoose.model("wallet", walletSchema);

export default Wallet;
