import Address from "../model/addressModel.js";
// _______________________________________________________________________//

// =========================== USER CONTROLLERS ===========================
// METHOD GET || Show all addresses 
export const getAddressDetails = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  try {
    const userId = req.user.id;
    const addresses = await Address.find({ userId });
    res.status(200).json({ success: true, addresses });
  } catch (error) {
    next(error);
  }
};

// METHOD POST || Add a new address 
export const addNewAddressDetails = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  try {
    const userId = req.user.id;
    const newAddress = new Address({ userId, ...req.body });
    const savedAddress = await newAddress.save();
    res.status(201).json({ success: true, savedAddress });
  } catch (error) {
    next(error);
  }
};

// METHOD PUT || Update an existing address 
export const updateAddressDetails = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updatedAddress = await Address.findOneAndUpdate(
      { _id: id, userId },
      req.body,
      { new: true }
    );

    if (!updatedAddress) {
      return res.status(404).json({ success: false, message: "Address not found." });
    }

    res.status(200).json({ success: true, updatedAddress });
  } catch (error) {
    next(error);
  }
};

// METHOD DELETE || Delete an address 
export const deleteAddressDetails = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  try {
    const { id } = req.params;
    const userId = req.user.id;
    const deletedAddress = await Address.findOneAndDelete({ _id: id, userId });

    if (!deletedAddress) {
      return res.status(404).json({ success: false, message: "Address not found." });
    }

    res.status(200).json({ success: true, message: "Address deleted successfully." });
  } catch (error) {
    next(error);
  }
};

// _______________________________________________________________________//