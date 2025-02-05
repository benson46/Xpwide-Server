import Category from "../model/categoryModel.js";
import Coupon from "../model/couponModel.js";


export const getAllCoupon = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const totalCoupons = await Coupon.countDocuments();
    const coupons = await Coupon.find().skip(skip).limit(Number(limit));

    res.json({ coupons, totalCoupons });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Create a new coupon
export const addNewCoupon = async (req, res) => {
  const { code,discount, minPurchaseAmount, startingDate, expiryDate, usageLimit, eligibleCategories } = req.body;
  console.log(req.body)
  // Validate required fields
  if (!code || !minPurchaseAmount || !startingDate || !expiryDate || !usageLimit || !eligibleCategories) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  const existingCoupon = await Coupon.findOne({ code });
  if (existingCoupon) {
    return res.status(400).json({ message: "Coupon code already exists." });
  }
  
  const coupon = new Coupon({
    code,
    discount,
    minPurchaseAmount,
    startingDate,
    expiryDate,
    usageLimit,
    eligibleCategories
  });

  try {
    const newCoupon = await coupon.save();
    res.status(201).json(newCoupon);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// // Update a coupon
// router.put('/:id', async (req, res) => {
//   try {
//     const coupon = await Coupon.findById(req.params.id);
//     if (!coupon) {
//       return res.status(404).json({ message: 'Coupon not found' });
//     }

//     const { code, minPurchaseAmount, startingDate, expiryDate, usageLimit, eligibleCategories } = req.body;

//     coupon.code = code || coupon.code;
//     coupon.minPurchaseAmount = minPurchaseAmount || coupon.minPurchaseAmount;
//     coupon.startingDate = startingDate || coupon.startingDate;
//     coupon.expiryDate = expiryDate || coupon.expiryDate;
//     coupon.usageLimit = usageLimit || coupon.usageLimit;
//     coupon.eligibleCategories = eligibleCategories || coupon.eligibleCategories;

//     const updatedCoupon = await coupon.save();
//     res.json(updatedCoupon);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// });

// // Delete a coupon
// router.delete('/:id', async (req, res) => {
//   try {
//     const coupon = await Coupon.findById(req.params.id);
//     if (!coupon) {
//       return res.status(404).json({ message: 'Coupon not found' });
//     }

//     await coupon.remove();
//     res.json({ message: 'Coupon deleted successfully' });
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// });

