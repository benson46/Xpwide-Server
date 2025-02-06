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
  const { amount, paymentStatus, type,products } = req.body; // 'credit' or 'debit'
  console.log(req.body)
  if(products){
    const product = products.reduce((acc,p)=>acc.push(p.productName),[])
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
    description: type === "credit" ? `Added ₹${amount} to wallet` : `Spent ₹${amount} for ${product}`,
    amount: amount,
  };

  userWallet.transactions.push(transaction);
  await userWallet.save();

  res.json({ success: true, wallet: userWallet });
};
