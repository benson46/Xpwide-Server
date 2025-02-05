import Wallet from "../model/walletModel.js";

// for getting wallet details of a user
export const getWalletDetails = async (req, res) => {
  const userId = req.user.id;

  let userWallet = await Wallet.findOne({ user: userId });
  if (!userWallet) {
    userWallet = new Wallet({ user: userId, balance: 0 });
  }

  res.json({ success: true, wallet: userWallet });
};

// for updating wallet balance
export const updateWalletbalance = async (req, res) => {
  const userId = req.user.id;
  const { amount, paymentStatus } = req.body;

  let userWallet = await Wallet.findOne({ user: userId });

  if (!userWallet) {
    userWallet = new Wallet({
      user: userId,
      balance: 0,
    });
  }

  if (paymentStatus !== "failed") {
    userWallet.balance += amount;
  }

  const transaction = {
    transactionDate: new Date(),
    transactionType: "credit",
    transactionStatus: paymentStatus === "failed" ? "failed" : "completed", // Use valid values here
    amount: amount,
  };
  

  userWallet.transactions.push(transaction);

  await userWallet.save();

  res.json({ success: true, wallet: userWallet });
};
