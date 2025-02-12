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



