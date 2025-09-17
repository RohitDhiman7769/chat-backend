import express from 'express';
import roomController from '../../controllers/room_contoller.js';
const roomRoute = express.Router();
const indexController = new roomController();

/**
 * @route   GET api/users/room-list
 * @desc    Fetch all rooms
 */
roomRoute.get('/room-list', indexController.getRoomsList);

/**
 * @route   GET api/users/get-room-chat
 * @desc    Get room chat by room id
 */
roomRoute.get('/get-room-chat', indexController.getRoomsChats);


/**
 * @route   POST api/users/creat-room
 * @desc    Create new room
 */
roomRoute.post('/creat-room', indexController.createRoom);


export default roomRoute;
