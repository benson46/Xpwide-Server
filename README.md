# ⚙️ XPWide Server

Backend of **XPWide**, a robust full-stack e-commerce platform powered by **Node.js**, **Express**, **MongoDB**, and **Redis**. This server manages user authentication, product and order handling, payment integration, and more — built for scalability and performance.

> 🖥️ **Frontend Repo:** [XPWide Client](https://github.com/benson46/Xpwide-Client)

---

## 🚀 Features

- 🔐 JWT Authentication with Access & Refresh Tokens
- 👤 User & Admin login system with protected routes
- 🛒 Product, cart, and order management
- 💳 Razorpay, Wallet & COD payment support
- 🧾 Admin Dashboard APIs: orders, products, banners, offers, categories
- ☁️ Cloudinary integration for optimized image uploads
- ✉️ Email services via Nodemailer
- ⚡ Redis Caching for high performance
- 📦 Deployed on AWS EC2 (backend), Vercel (frontend)

---

## 🛠️ Tech Stack

| Tech         | Description                          |
|--------------|--------------------------------------|
| Node.js      | Runtime environment                  |
| Express.js   | Backend framework                    |
| MongoDB      | NoSQL database                       |
| Redis        | In-memory caching                    |
| JWT          | Secure user session management       |
| Cloudinary   | Media upload and optimization        |
| Razorpay     | Payment gateway                      |
| Nodemailer   | Email services                       |
| AWS EC2      | Deployment and server hosting        |

---

## 📦 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/benson46/Xpwide-Server.git
cd Xpwide-Server
```

### 2. Install Dependencies
```
npm install
```
### ⚙️ Backend Environment Variables
Create a .env file in the root directory and add the following:
```
PORT=5000
MONGO_URI=your_mongodb_atlas_uri
NODE_ENV=development

REDIS_HOST=your_redis_host
REDIS_PASSWORD=your_redis_password
REDIS_PORT=your_redis_port

ACCESS_TOKEN_LIFETIME=15m
ACCESS_TOKEN_SECRET=your_access_token_secret

REFRESH_TOKEN_LIFETIME=7d
REFRESH_TOKEN_SECRET=your_refresh_token_secret

CORS_CLIENT_SIDE=https://your-frontend.com
CORS_CLIENT_SIDE1=https://www.your-frontend.com
CORS_CLIENT_SIDE2=http://localhost:5173

CLOUDINARY_URL=your_cloudinary_url
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

NODEMAILER_EMAIL=your_email@gmail.com
NODEMAILER_PASS=your_email_app_password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

JWT_SECRET=your_jwt_secret
JWT_TIMEOUT=12h

```

### 3. Run the server
```
npm start
Server will run at: http://localhost:5000

```


## 📡 API Base URLs

```
User APIs: http://localhost:5000/api/user

Admin APIs: http://localhost:5000/api/admin

Google Login: http://localhost:5000/api/google
```

# 🖼️ API Usage Demo
![](https://raw.githubusercontent.com/benson46/Xpwide-Client/refs/heads/main/xpwide2.png)

![](https://raw.githubusercontent.com/benson46/Xpwide-Client/refs/heads/main/xpwide1.png)

## 🤝 Contributions
Contributions, feedback, and suggestions are welcome!
Feel free to fork the repo and submit a pull request. 💡


Let me know if you want a `.env.example` file for contributors 

## 📫 Contact Me
Have questions or want to collaborate?

📧 [Email: bensonbaiju46@gmail.com](mailto:bensonbaiju46@gmail.com) 
📞 [Phone: +918943393066](tel:+918943393066) 
💼 [LinkedIn: LinkedIn Profile](https://linkedin.com/in/bensonbvaroor)  