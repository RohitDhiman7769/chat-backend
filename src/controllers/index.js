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

    // // GET /fetch-all-users
    // async getUsers(req, res) {
    //     try {
    //         const userId = req.query.userId;
    //         const users = await db.collection('users').find({
    //             _id: { $ne: new ObjectId(userId) }
    //         }, { projection: { password: 0 } }).toArray();
    //         users.forEach(user => user._id = user._id.toString());
    //         res.json({ message: "Data fetched successfully", code: 200, data: users });
    //     } catch (err) {
    //         res.status(500).json({ error: err.message });
    //     }
    // }
    // GET /fetch-all-users


    // async getUsers(req, res) {
    //     try {
    //         const userId = req.query.userId;

    //         // Ensure userId exists and is valid
    //         // if (!userId) {
    //         //     return res.status(400).json({ message: "userId is required in query params" });
    //         // }

    //         // Fetch all users except the one with this userId
    //         const users = await db.collection("users")
    //             .find(
    //                 { _id: { $ne: new ObjectId(userId) } }, // Exclude logged-in user
    //                 { projection: { password: 0 } } // Exclude sensitive field
    //             )
    //             .toArray();

    //         // Convert ObjectIds to strings
    //         const formattedUsers = users.map(user => ({
    //             ...user,
    //             _id: user._id.toString()
    //         }));

    //         res.json({
    //             message: "Data fetched successfully",
    //             code: 200,
    //             data: formattedUsers
    //         });

    //     } catch (err) {
    //         res.status(500).json({ error: err.message });
    //     }
    // }


    // GET /fetch-all-users
// const { ObjectId } = require('mongodb');

async getUsers(req, res) {
    try {
        const { userId } = req.query;

        // Build filter: by default empty => return all users
        const filter = {};

        // If userId provided and valid, exclude that user
        if (userId && ObjectId.isValid(userId)) {
            filter._id = { $ne: new ObjectId(userId) };
        }

        const users = await db
            .collection('users')
            .find(filter, { projection: { password: 0 } }) // hide password
            .toArray();

        // Convert ObjectId to string for frontend
        const cleanUsers = users.map(u => ({ ...u, _id: u._id.toString() }));

        res.json({ message: "Data fetched successfully", code: 200, data: cleanUsers });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}


    // POST /log-in
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

    // POST /sign-up
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

    // GET /room-list
    async getRoomsList(req, res) {
    try {
        const userId = req.query.userId;
        const rooms = await db.collection('room_member_id').find({ added_to: userId }).toArray();
        if (!rooms.length) {
            return res.json({ message: "No rooms exist", code: 200, room_list: [] });
        }
        rooms.forEach(room => room._id = room._id.toString());
        let room_details = [];
        if (rooms.length > 0) {
            room_details = await db.collection('rooms').find({ room_id: rooms[0].room_id }).toArray();
            room_details.forEach(detail => detail._id = detail._id.toString());
        }
        res.json({
            message: "Room list fetched successfully",
            code: 200,
            data: room_details
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

    // POST /creat-room
    async createRoom(req, res) {
    try {
        const { userId, roomName, roomType, roomImgIcon, roomMembersIds } = req.body;
        const now = new Date();
        const formatted_date = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

        for (const id of roomMembersIds) {
            await db.collection('room_member_id').insertOne({
                added_by: userId,
                added_to: id,
                room_id: formatted_date
            });
        }

        await db.collection('rooms').insertOne({
            user_id: userId,
            room_id: formatted_date,
            room_name: roomName,
            room_type: roomType,
            image: roomImgIcon
        });

        const roomDetails = await db.collection('rooms').find({ room_id: formatted_date }).toArray();
        const room_members = await db.collection('room_member_id').find({ room_id: formatted_date }).toArray();
        const added_to_ids = room_members.map(member => member.added_to);

        const user_list = await db.collection('users').find({
            _id: { $in: added_to_ids.map(id => new ObjectId(id)) }
        }).toArray();

        const room_details = convertObjectId(roomDetails);
        const room_members_data = convertObjectId(user_list);

        const update_response_data = {
            room_details,
            member_list: room_members_data
        };

        res.json({ message: "Data successfully", code: 200, data: update_response_data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

    // GET /get-room-chat
    async getRoomsChats(req, res) {
    // Implement your chat fetching logic here
    res.send('its working');
}

    // GET /search-user
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

    // POST /add-friend
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

    // GET /profile
    async profile(req, res) {
    try {
        const user_id = req.query.user_id;


        // console.log(client.)
        const user = await db.collection('users').findOne({ _id: new ObjectId(user_id) }, { projection: { password: 0 } });
        // console.log('user: ', user);

        // const user = await db.collection('users').findOne({ _id: new ObjectId(user_id) }, { projection: { password: 0 } });
        // if (!user) return res.status(404).json({ error: "User not found" });

        // console.log('1111111111111', user_id)
        const addFriendRequest = await db.collection('user_friends').find({
            added_to: new ObjectId(user_id),
            added_status: 1
        }, { projection: { added_by: 1 } }).toArray();

        // console.log('2222222222222222222', addFriendRequest)

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

    // POST /confirm-request
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

    // GET /added-users-list
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

    // GET /update-initial-status
    async updateInitialPopupStatus(req, res) {
    try {
        const userId = req.query.userId;
        await db.collection('users').updateOne({ _id: new ObjectId(userId) }, { $set: { initial_login: 2 } });
        res.json({ message: "Update Successfully", code: 200 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

    // GET /get-single-user-profile-data
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

    // GET /report-user
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

// module.exports = IndexController;
export default IndexController;