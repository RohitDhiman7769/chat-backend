import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import client, { db } from '../config/db.js';

const JWT_SECRET = 'your_jwt_secret';

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

class IndexController {
    // GET /
    home(req, res) {
        res.send('Welcome to the Home Page');
    }

    // GET /about
    about(req, res) {
        res.send('This is the About Page');
    }

    /**
     * 
     * @param {*} req  get userId from query params
     * @param {*} res send all users except the logged in user
     */
    async getUsers(req, res) {
        try {
            // console.log('working', req.query)
            const userId = req.query.userId ;
            console.log('userId: ', userId);
            const users = await db.collection('users').find({
                _id: { $ne: new ObjectId(userId) }
            }, { projection: { password: 0 } }).toArray();
            users.forEach(user => user._id = user._id.toString());
            res.json({ message: "Data fetched successfully", code: 200, data: users });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }



    /**
     * 
     * @param {*} req  get email and password from body
     * @param {*} res send user data and access token as response
     * @returns 
     */
    async login(req, res) {
        try {
            const { email, password } = req.body;
            const user = await db.collection('users').findOne({ email });
            if (!user) return res.status(400).json({ error: "Email not registered" });

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(401).json({ error: "Invalid password" });

            const access_token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1d' });
            user._id = user._id.toString();
            delete user.password;
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

    /**
     * 
     * @param {*} req get email, password and profileImage from body
     * @param {*} res send success message and auth token as response
     * @returns 
     */
    async createUser(req, res) {
        try {
            const { email, password, profileImage } = req.body;
            if (!email || !password) return res.status(401).json({ error: "Missing required fields" });

            const user = await db.collection('users').findOne({ email });
            if (user) return res.status(400).json({ error: "Email already registered" });

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

    /**
     * 
     * @param {*} req get char from query params to search user by name
     * @param {*} res send matched user list as response
     * @returns 
     */
    async searchUserName(req, res) {
        try {
            const char = (req.query.chr || '').trim();
            if (!char) return res.status(400).json({ error: "Character parameter (chr) is required" });

            const regex = new RegExp('^' + char, 'i');
            const users = await db.collection('users').find({ email: { $regex: regex } }, { projection: { password: 0 } }).toArray();
            users.forEach(user => user._id = user._id.toString());
            res.json({ message: "User data fetched successfully", code: 200, data: users });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    /**
     * 
     * @param {*} req  get user_id and arrayOfAddedUsersId from body
     * @param {*} res send success message as response
     */
    async createFriends(req, res) {
        try {
            const { user_id, arrayOfAddedUsersId } = req.body;
            const now = new Date();
            const formatted_time = now.toISOString().replace('T', ' ').slice(0, 19);

            await db.collection('users').updateOne({ _id: new ObjectId(user_id) }, { $set: { initial_login: 2 } });

            for (const friend_id of arrayOfAddedUsersId) {
                await db.collection('user_friends').insertOne({
                    added_by: new ObjectId(user_id),
                    added_to: new ObjectId(friend_id),
                    added_status: 1,
                    time: formatted_time
                });
            }
            res.json({ message: "Request send successfully! Waiting for adding back", code: 200 });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    /**
     * 
     * @param {*} req get user_id from query params
     * @param {*} res send user profile data and pending friend requests as response
     */
    async profile(req, res) {
        try {
            const user_id = req.query.user_id;
            const user = await db.collection('users').findOne({ _id: new ObjectId(user_id) }, { projection: { password: 0 } });
            const addFriendRequest = await db.collection('user_friends').find({
                added_to: new ObjectId(user_id),
                added_status: 1
            }, { projection: { added_by: 1 } }).toArray();
            const added_by_list = addFriendRequest.map(doc => doc.added_by);
            const users = await db.collection('users').find({ _id: { $in: added_by_list.map(id => new ObjectId(id)) } }, { projection: { password: 0 } }).toArray();
            user._id = user._id.toString();

            res.json({
                message: "Profile data fetched successfully",
                code: 200,
                data: convertObjectId({
                    profileData: user,
                    addingRequest: users
                })
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    /**
     * 
     * @param {*} req get user_id and confirm_user_request_id from body
     * @param {*} res send success message and added user data as response
     */
    async confirmPendingReq(req, res) {
        try {
            const { user_id, confirm_user_request_id } = req.body;
            await db.collection('user_friends').updateOne(
                { added_to: user_id, added_by: confirm_user_request_id },
                { $set: { added_status: 2 } }
            );
            const user = await db.collection('users').findOne({ _id: new ObjectId(confirm_user_request_id) });
            user._id = user._id.toString();
            res.json({ message: "Added Successfully", code: 200, data: user });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    /**
     * 
     * @param {*} req get userId from query params
     * @param {*} res send all added friends as response
     * @returns 
     */
    async fetchAddedUsers(req, res) {
        // console.log('working', client)
        try {
            const userId = req.query.userId;
            if (!userId) return res.status(400).json({ error: "userId is required" });

            let objectUserId;
            try {
                objectUserId = new ObjectId(userId);
            } catch {
                return res.status(400).json({ error: "Invalid userId" });
            }

            const addFriendRequest = await db.collection('user_friends').find({
                added_status: 2,
                $or: [
                    { added_by: userId },
                    { added_to: userId }
                ]
            }, { projection: { added_by: 1, added_to: 1 } }).toArray();

            const result_ids = [];
            for (const record of addFriendRequest) {
                if (record.added_by === userId) {
                    result_ids.push(record.added_to);
                } else {
                    result_ids.push(record.added_by);
                }
            }

            const object_ids = result_ids.map(id => new ObjectId(id));
            const friends = await db.collection('users').find({ _id: { $in: object_ids } }, { projection: { password: 0, reported_count: 0, initial_login: 0 } }).toArray();
            friends.forEach(friend => friend._id = friend._id.toString());

            res.json({ message: "Fetched Successfully", code: 200, data: friends });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    /**
     * 
     * @param {*} req get userId from query params
     * @param {*} res send success message as response
     */
    async updateInitialPopupStatus(req, res) {
        try {
            const userId = req.query.userId;
            await db.collection('users').updateOne({ _id: new ObjectId(userId) }, { $set: { initial_login: 2 } });
            res.json({ message: "Update Successfully", code: 200 });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    /**
     * 
     * @param {*} req get userId from query params 
     * @param {*} res send single user profile data as response
     */
    async fetchUserProfile(req, res) {
        try {
            const userId = req.query.userId;
            const user = await db.collection('users').findOne({ _id: new ObjectId(userId) }, { projection: { password: 0, initial_login: 0 } });
            user._id = user._id.toString();
            res.json({ message: "Update Successfully", code: 200, data: user });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    /**
     * 
     * @param {*} req get userId from query params
     * @param {*} res send success message as response
     * @returns 
     */
    async reportUserId(req, res) {
        try {
            const userId = req.query.userId;
            const user = await db.collection('users').findOne({ _id: new ObjectId(userId) }, { projection: { reported_count: 1 } });
            if (!user) return res.status(404).json({ message: "User not found", code: 404 });

            const reported_count = parseInt(user.reported_count || 0, 10);
            await db.collection('users').updateOne(
                { _id: new ObjectId(userId) },
                { $set: { reported_count: reported_count + 1 } }
            );
            res.json({ message: 'User Reported successfully', code: 200 });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

export default IndexController;