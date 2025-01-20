import JWT from 'jsonwebtoken'

export const adminGenerateAccessToken = async (adminId) => {
    const accessToken = await JWT.sign(
        { adminId },
        process.env.ADMIN_ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ADMIN_ACCESS_TOKEN_LIFETIME },
    )
    return accessToken;
}


export const adminGenerateRefreshToken = async (adminId) => {
    const refreshToken = await JWT.sign(
        { adminId },
        process.env.ADMIN_REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.ADMIN_REFRESH_TOKEN_LIFETIME },
    )

    return refreshToken;
}


export const adminDecodeRefreshToken = async (refreshToken) => {
    const decode = jwt.verify(refreshToken, process.env.ADMIN_REFRESH_TOKEN_SECRET);
    return {...decode};
}

export const adminDecodeAccessToken = async (accessToken) => {
    const decode = jwt.verify(accessToken, process.env.ADMIN_ACCESS_TOKEN_SECRET);
    return decode;
}
