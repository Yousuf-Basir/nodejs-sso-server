import express, { Response } from 'express';
import {
  registerUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  authenticateUser
} from '../../controllers/userController';
import { isAuthenticated, AuthRequest, generateToken } from '../../middlewares/auth';
import Client from '../../models/Client';

const router = express.Router();

// Web Routes
router.get('/profile', isAuthenticated, async (req: AuthRequest, res: Response) => {
    const { clientId, redirectUrl } = req.query;

    if (clientId && redirectUrl) {
        try {
            const client = await Client.findOne({ clientId });
            if (!client || !client.redirectUrls.includes(redirectUrl as string)) {
                req.flash('error', 'Invalid client or redirect URL');
                return res.redirect('/profile');
            }

            const token = generateToken(req.user, client);
            return res.redirect(`${redirectUrl}?token=${token}`);
        } catch (error) {
            req.flash('error', 'Error processing client redirect');
            return res.redirect('/profile');
        }
    }

    res.render('user/profile', { user: req.user });
});

// API Routes
router.post('/register', registerUser);
router.post('/login', authenticateUser);
router.get('/client/:clientId', getUsers);
router.get('/user/:id', getUserById);
router.put('/user/:id', updateUser);
router.delete('/user/:id', deleteUser);

export default router; 