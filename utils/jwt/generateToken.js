import jwt from "jsonwebtoken";

export const generateAccessToken = (user) => {
  if (user.role == "user") {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: process.env.ACCESS_TOKEN_LIFETIME,
    });
  }
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ADMIN_ACCESS_TOKEN_LIFETIME,
  });
};

export const generateRefreshToken = (user) => {
  if (user.role == "user") {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: process.env.ADMIN_REFRESH_TOKEN_LIFETIME,
    });
  }
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ADMIN_REFRESH_TOKEN_LIFETIME,
  });
};
