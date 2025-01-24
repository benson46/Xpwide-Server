import jwt from "jsonwebtoken";

export const generateAccessToken = (user) => {
  const payload = {
    id: user.id, 
    role: user.role,
  };

  const expiresIn = process.env.ACCESS_TOKEN_LIFETIME;

  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn });
};


export const generateRefreshToken = (user) => {
  const payload = {
    id: user.id, 
    role: user.role,
  };

  const expiresIn = process.env.REFRESH_TOKEN_LIFETIME;

  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn });
};
