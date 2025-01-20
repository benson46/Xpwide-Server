import JWT from 'jsonwebtoken'

export const generateAccessToken = async (userId) => {
    const accessToken = await JWT.sign(
        { userId },
        process.env.USER_ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.USER_ACCESS_TOKEN_LIFETIME },
    )
    return accessToken;
}


export const generateRefreshToken = async (userId) => {
    const refreshToken = await JWT.sign(
        { userId },
        process.env.USER_REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.USER_REFRESH_TOKEN_LIFETIME },
    )

    return refreshToken;
}


export const decodeRefreshToken = async (refreshToken) => {
    const decode = jwt.verify(refreshToken, process.env.USER_REFRESH_TOKEN_SECRET);
    return {...decode};
}

export const decodeAccessToken = async (accessToken) => {
    const decode = jwt.verify(accessToken, process.env.USER_ACCESS_TOKEN_SECRET);
    return decode;
}
