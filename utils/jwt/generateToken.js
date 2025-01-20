import JWT from "jsonwebtoken";

export const generateTokens = (userId) => {
    const accessToken = JWT.sign(
      { userId },
      process.env.USER_ACCESS_TOKEN_SECRET,
      {
        expiresIn: "15m",
      }
    );
  
    const refreshToken = JWT.sign(
      { userId },
      process.env.USER_REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d",
      }
    );
  
    return { accessToken, refreshToken };
  };
  