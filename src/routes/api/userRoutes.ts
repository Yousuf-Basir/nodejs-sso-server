import express, { Response } from 'express';
import {
    registerUser,
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    authenticateUser
} from '../../api/controllers/userController';
import { isAuthenticated } from '../../middlewares/auth';
import User from '../../models/User';
import { AuthRequest } from '../../middlewares/auth';

const router = express.Router();

// Get current authenticated user
router.get('/me', isAuthenticated, async (req: AuthRequest, res: Response) => {
    console.log(req.user);
    try {
        // Get complete user data from database
        const user = await User.findById(req.user._id).select('-password');
        
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Return user data
        return res.json({
            status: 'success',
            data: {
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    profileImageUrl: user.profileImageUrl,
                    createdAt: user.createdAt,
                    googleId: user.googleId,
                    facebookId: user.facebookId
                }
            }
        });
    } catch (error) {
        console.error('Error fetching user data:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error fetching user data'
        });
    }
});

// User management API endpoints
router.post('/register', registerUser);
router.post('/login', authenticateUser);
router.get('/users/client/:clientId', isAuthenticated, getUsers);
router.get('/users/:id', isAuthenticated, getUserById);
router.put('/users/:id', isAuthenticated, updateUser);
router.delete('/users/:id', isAuthenticated, deleteUser);

export default router;
