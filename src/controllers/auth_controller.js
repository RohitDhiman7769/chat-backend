import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import client, { db } from '../config/db.js';

// const JWT_SECRET = 'your_jwt_secret';

function convertObjectId(obj) {
    if (obj instanceof ObjectId) return obj.toString();
    if (Array.isArray(obj)) return obj.map(convertObjectId);
    if (obj && typeof obj === 'object') {
        const newObj = {};
        for (const key in obj) newObj[key] = convertObjectId(obj[key]);
        return newObj;
    }
    return obj;
}


function generateTokens(user) {
    const access_token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
 return { access_token, refreshToken };
}

class authController {


    // Refresh
    async refresh  (req, res) {
        const token = req.cookies.refreshToken;
        if (!token) return res.status(401).json({ msg: "No token provided" });

        jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
            if (err) return res.status(403).json({ msg: "Invalid refresh token" });

            const accessToken = jwt.sign(
                { id: user.id },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: "15m" }
            );

            res.json({ accessToken });
        });
    };

    // POST /log-in
    async login(req, res) {
        try {
            const { email, password } = req.body;
            const user = await db.collection('users').findOne({ email });
            if (!user) return res.json({ code: 400, error: "Email not registered" });

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(401).json({ error: "Invalid password" });

            // const access_token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1d' });

            const { access_token, refreshToken } = generateTokens(user);

            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: "strict",
            });

            // user._id = user._id.toString();
            // delete user.password;
            res.json({
                code: 200,
                message: "Login successful",
                user_data: user,
                access_token
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // POST /sign-up
    async createUser(req, res) {
        try {
            const { email, password, profileImage } = req.body;
            if (!email || !password) return res.status(401).json({ error: "Missing required fields" });

            const user = await db.collection('users').findOne({ email });
            if (user) return res.json({ code: 400, message: "Email already registered" });

            const hashed_password = await bcrypt.hash(password, 10);
            await db.collection('users').insertOne({
                email,
                password: hashed_password,
                profile_img: profileImage,
                initial_login: 1,
                reported_count: 0
            });
            res.json({ message: "User created successfully", auth_token: hashed_password, code: 200 });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }


}
export default authController;
