import express from 'express';
import IndexController from '../controllers/index.js'; 

const router = express.Router();
const indexController = new IndexController();

router.get('/fetch-all-users', indexController.getUsers);

router.post('/sign-up', indexController.createUser);

router.post('/log-in', indexController.login);

router.get('/room-list', indexController.getRoomsList);

router.get('/get-room-chat', indexController.getRoomsChats);

router.post('/creat-room', indexController.createRoom);

router.get('/search-user', indexController.searchUserName);

router.get('/profile', indexController.profile);

router.post('/add-friend', indexController.createFriends);

router.post('/confirm-request', indexController.confirmPendingReq);

router.get('/added-users-list', indexController.fetchAddedUsers);

router.get('/update-initial-status', indexController.updateInitialPopupStatus);

router.get('/get-single-user-profile-data', indexController.fetchUserProfile);

router.get('/report-user', indexController.reportUserId);

router.get('/', indexController.home);
router.get('/about', indexController.about);

export default router;