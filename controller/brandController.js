import Brand from "../model/brandModel.js";

// --------------------------------------------------------------------------------------------------------

// Method GET || Get All Brands
export const getAllBrands = async (req, res, next) => {
  try {
    const brands = await Brand.find();
    res.status(200).json({ success: true, brands });
  } catch (error) {
    next(error);
  }
};

// Method Post || Add New Brand
export const addNewBrands = async (req, res, next) => {
  const { title, description } = req.body;
  try {
    if (!title || !description) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const brand = new Brand({ title, description });
    await brand.save();

    res
      .status(201)
      .json({ success: true, message: "Brands added successfully.", brand });
  } catch (error) {
    next(error);
  }
};

// Method Patch || List & Unlist Brand
export const updateBrandStatus = async (req, res, next) => {
  const { brandId } = req.body;

  try {
    const brand = await Brand.findById(brandId);

    if (!brand) {
      return res
        .status(404)
        .json({ success: false, message: "brand not found." });
    }

    brand.isBlocked = !brand.isBlocked;
    await brand.save();

    res
      .status(200)
      .json({ success: true, message: "brand status updated.", brand });
  } catch (error) {
    next(error);
  }
};

// Method Put || Update Brand
export const updateBrand = async (req, res, next) => {
  const { _id: brandId, title, description } = req.body;
  try {
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res
        .status(404)
        .json({ success: false, message: "Brand not found" });
    }

    brand.title = title || brand.title;
    brand.description = description || brand.description;
    await brand.save();

    res
      .status(200)
      .json({ success: true, message: "Brand updated successfully" });
  } catch (error) {
    next(error);
  }
};
