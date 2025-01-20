import Brand from "../model/brandModel.js";

// Method GET || Get all brands
export const getAllBrands = async (req, res) => {
  try {
    const brands = await Brand.find();
    res.status(200).json({ success: true, brands });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Method Post || Add new brand
export const addNewBrands = async (req, res) => {
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
    res.status(500).json({ status: false, message: error.message });
  }
};

// Method Patch || ist & Unlist brand
export const updateBrandStatus = async (req, res) => {
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// Method Put || Update brand
export const updateBrand = async (req, res) => {
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
    res.status(500).json({ success: false, message: error.message });
  }
};
