import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

const client = createClient({
	password: process.env.REDIS_PASSWORD,
	socket: {
		host: "redis-10737.crce179.ap-south-1-1.ec2.redns.redis-cloud.com",
		port: 10737,
	},
});

export const storeData = async (key, value, expiration) => {
	try {
		await client.setEx(key, expiration, JSON.stringify(value));
		console.log("Data stored in redis");
		return "Data stored Successfully";
	} catch (error) {
		console.log(error);
		return error;
	}
};

export const storeRefreshToken = async (userId, value) => {
	try {
		await client.setEx(`refreshToken${userId}`, 604800, JSON.stringify(value));
		return "RefreshToken token stored Successfully";
	} catch (error) {
		console.log(error);
		return error;
	}
};

export const getRefreshToken = async (userId) => {
	try {
		const refreshToken = await client.get(`refreshToken${userId}`);
		if(refreshToken){
			// console.log(refreshToken)
		return refreshToken.trim();
		}

		return "Refresh Token expired"

	} catch (error) {
		console.log(error);
		return error;
	}
};

export const deleteRefreshToken = async (userId) => {
	try {
		if (!userId || typeof userId !== 'string') {
			throw new Error("Invalid userId provided");
		}

		const result = await client.del(`auth:refreshToken:${userId}`);
		if (result === 1) {
			return { success: true, message: "Refresh token deleted successfully" };
		} else {
			return {
				success: false,
				message: "No refresh token found. It may have already been deleted.",
			};
		}
	} catch (error) {
		console.error("Error deleting refresh token:", error);
		throw new Error(`Failed to delete refresh token: ${error.message}`);
	}
};


export const storeOtp = async (email, otp) => {
	try {
		await client.setEx(`otp:${email}`, 500, otp);
		console.log("OTP stored successfully");
		return "OTP stored successfully";
	} catch (error) {
		console.log(error);
	}
};

export const getOtp = async (email) => {
	try {
		const data = await client.get(`otp:${email}`);
		if (data) {
			return JSON.parse(data);
		}
		return null;
	} catch (error) {
		console.log(error);
		return error;
	}
};

export const getData = async (email) => {
	try {
		const data = await client.get(email);
		if (data) {
			return JSON.parse(data);
		}
		return null;
	} catch (error) {
		return error;
	}
};

export default client;
