import jwt from 'jsonwebtoken'
import User from '../model/userModel.js';

export const authenticateUser = async (req, res, next) => {
    const authHead = req.headers['authorization'];
    if (!authHead || !authHead.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'AccessToken Required' });
    }

    const token = authHead && authHead.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'AccessToken Required' });
    }

    try {
        const decode = await jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
        if (decode.role !== 'user') {
            return res
                .status(401)
                .json({ message: 'Invalid token or token expired'});
        }
        req.user = decode;
        next();
    } catch (error) {
        console.log(error.message);
        return res.status(401).json({ message: 'Invalid or Expired Token' });
    }
};

