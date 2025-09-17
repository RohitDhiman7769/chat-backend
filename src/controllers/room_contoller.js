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

class roomController {

    /**
     * 
     * @param {*} req get userId from query params
     * @param {*} res send room list as response of specific user
     * @returns 
     */
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

/**
 * 
 * @param {*} req get room details from body  to create new room 
 * @param {*} res send newly created room details as response
 */
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
        res.send('its working');
    }

}

export default roomController;