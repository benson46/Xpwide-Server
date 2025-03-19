import Banner from '../model/bannerModel.js';

export const createBanner = async (req, res) => {
  try {

    const { title, link, image } = req.body;
    
    if (!title || !link || !image) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const banner = await Banner.create({ title, link, image });
    res.status(201).json(banner);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getBanners = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const banners = await Banner.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Banner.countDocuments();
    
    res.json({
      banners,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!banner) return res.status(404).json({ error: 'Banner not found' });
    res.json(banner);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });
    res.json({success:true, message: 'Banner removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const toggleBannerStatus = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });

    banner.isActive = !banner.isActive;
    await banner.save();
    res.json(banner);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};