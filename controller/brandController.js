import Brand from "../model/brandModel.js";

// _______________________________________________________________________//

// =============================== ADMIN CONTROLLERS ===============================
// METHOD GET || Fetch all brands
export const getAllBrands = async (req, res, next) => {
  try {
    const { page = 1, limit = 5 } = req.query;

    const skip = (page - 1) * limit;

    const totalBrands = await Brand.countDocuments();
    const brands = await Brand.find().skip(skip).limit(parseInt(limit))
    res.status(200).json({ success: true, brands,totalBrands });
  } catch (error) {
    next(error);
  }
};

// METHOD POST || Add a new brand
export const addBrand = async (req, res, next) => {
  const { title, description } = req.body;
  try {
    if (!title || !description) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }
    const brand = new Brand({ title, description });
    await brand.save();
    res.status(201).json({ success: true, message: "Brand added successfully.", brand });
  } catch (error) {
    next(error);
  }
};

// METHOD PATCH || Toggle brand status (block/unblock)
export const updateBrandStatus = async (req, res, next) => {
  const { brandId } = req.body;
  try {
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: "Brand not found." });
    }
    brand.isBlocked = !brand.isBlocked;
    await brand.save();
    res.status(200).json({ success: true, message: `Brand ${brand.isBlocked ? "blocked" : "unblocked"} successfully.` });
  } catch (error) {
    next(error);
  }
};

// METHOD PUT || Update brand details
export const updateBrand = async (req, res, next) => {
  const { _id: brandId, title, description } = req.body;
  try {
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: "Brand not found." });
    }
    brand.title = title || brand.title;
    brand.description = description || brand.description;
    await brand.save();
    res.status(200).json({ success: true, message: "Brand updated successfully." });
  } catch (error) {
    next(error);
  }
};

//--------------------------------------------------------------------------------------------------------
