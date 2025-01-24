import jwt from "jsonwebtoken";

// Function to generate a new access token
export const generateAccessToken = (user) => {
  const payload = {
    id: user.id, 
    role: user.role,
  };

  const expiresIn = process.env.ACCESS_TOKEN_LIFETIME;

  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn });
};

// Function to generate a refresh token
export const generateRefreshToken = (user) => {
  const payload = {
    id: user.id, 
    role: user.role,
  };

  const expiresIn = process.env.REFRESH_TOKEN_LIFETIME;

  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn });
};

// Function to generate a new access token from refresh token

export const refreshAccessToken = async (refreshToken) => {
  try {
    // Verify the refresh token
    console.log("Cookies:", req.cookies);

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const userData = {
      id: decoded.id,
      role: decoded.role,
    };

    // Generate a new access token (use your existing token generation logic)
    const newAccessToken = generateAccessToken(userData);

    console.log("Generated New Access Token:", newAccessToken);

    return newAccessToken;
  } catch (error) {
    console.error("Error verifying refresh token:", error.message);
    throw new Error("Invalid refresh token");
  }
};
