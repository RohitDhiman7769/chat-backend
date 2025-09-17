import express from 'express';
import IndexController from '../controllers/index.js'; 

const router = express.Router();
const indexController = new IndexController();
/**
 * @route   GET api/users/fetch-all-users
 * @desc    Fetch all users
 */
router.get('/fetch-all-users', indexController.getUsers);

/**
 * @route   GET api/users/search-user
 * @desc    Search user by name
 */
router.get('/search-user', indexController.searchUserName);

/**
 * @route   GET api/users/profile
 * @desc    User profile
 */
router.get('/profile', indexController.profile);

/**
 * @route   POST api/users/add-friend
 * @desc    Add friend (send friend request)
 */

router.post('/add-friend', indexController.createFriends);

/**
 * @route   GET api/users/pending-requests
 * @desc    Get pending friend requests
 */
router.post('/confirm-request', indexController.confirmPendingReq);

/**
 * @route   GET api/users/fetch-friends
 */
router.get('/added-users-list', indexController.fetchAddedUsers);

/**
 * @route   GET api/users/update-initial-status
 * @desc    Update initial popup status
 */
router.get('/update-initial-status', indexController.updateInitialPopupStatus);

/**
 * @route   GET api/users/get-single-user-profile-data
 * @desc    Get single user profile data
 */
router.get('/get-single-user-profile-data', indexController.fetchUserProfile);

/**
 * @route   GET api/users/report-user
 * @desc    Report user by id
 */
router.get('/report-user', indexController.reportUserId);

/**
 * @route   GET api/users/
 * @desc    Home page
 */
router.get('/', indexController.home);

/**
 * @route   GET api/users/about
 * @desc    About page  
 */
router.get('/about', indexController.about);

export default router;