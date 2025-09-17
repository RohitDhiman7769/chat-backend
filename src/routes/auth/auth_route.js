import express from 'express';
import authController from '../../controllers/auth_controller.js';
const authRoute = express.Router();
const indexController = new authController();

/**
 * @route   POST api/users/sign-up
 * @desc    Register user
 */
authRoute.post('/sign-up', indexController.createUser);

/**
 * @route   POST api/users/log-in
 * @desc    Login user
 */
authRoute.post('/log-in', indexController.login);

export default authRoute;
