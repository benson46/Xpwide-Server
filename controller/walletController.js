import Wallet from "../model/walletModel.js";

// _______________________________________________________________________//

// =============================== USER CONTROLLERS ===============================
// METHOD GET || Fetch wallet details of a user
export const getWalletDetails = async (req, res,next) => {
  const userId = req.user.id;
  try {
    let userWallet = await Wallet.findOne({ user: userId });
    if (!userWallet) {
      userWallet = new Wallet({ user: userId, balance: 0 });
    }
  
    res.json({ success: true, wallet: userWallet });
  } catch (error) {
    next(error)
  }
};

// METHOD PUT || Updating wallet balance
export const updateWalletBalance = async (req, res,next) => {
  const userId = req.user.id;
  const { amount, paymentStatus, type, products } = req.body;

  let productNames = "";

  if (products && Array.isArray(products)) {
    productNames = products.map((p) => p.productName).join(", ");
  }

  let userWallet = await Wallet.findOne({ user: userId });

  if (!userWallet) {
    userWallet = new Wallet({ user: userId, balance: 0 });
  }

  if (type === "credit" && paymentStatus !== "failed") {
    userWallet.balance += amount;
  } else if (type === "debit" && userWallet.balance >= amount) {
    userWallet.balance -= amount;
  } else {
    return res.status(400).json({ message: "Insufficient balance" });
  }

  const transaction = {
    transactionDate: new Date(),
    transactionType: type,
    transactionStatus: paymentStatus === "failed" ? "failed" : "completed",
    description:
      type === "credit"
        ? `Added ₹${amount} to wallet`
        : `Spent ₹${amount} for buying product`,//${productNames}
    amount: amount,
  };
  try {
    userWallet.transactions.push(transaction);
    await userWallet.save();
  
    res.json({ success: true, wallet: userWallet });
  } catch (error) {
    next(error)
  }
};
// _______________________________________________________________________//