import jwt from "jsonwebtoken";
export const authenticateAdmin = async (req, res, next) => {
  const authHead = req.headers["authorization"];
  const token = authHead && authHead.split(" ")[1];

  console.log(token);
  if (!token) {
    return res.status(401).json({ message: "AccessToken Required" });
  }

  try {
    const decode = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (decode.role !== "admin") {
      console.log(decode.role);
      return res.status(401).json({ message: "Invalid Token" });
    }

    req.user = decode;
    next();
  } catch (error) {
    console.log(error.message);
    console.log("ivda ?");
    return res.status(401).json({ message: "Invalid or Expired Token" });
  }
};
