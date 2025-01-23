import express, { Response } from 'express';
import { isAuthenticated, AuthRequest } from '../../middlewares/auth';
import Client from '../../models/Client';
import User from '../../models/User';
import { generateToken } from '../../middlewares/auth';

const router = express.Router();

// Profile page
router.get('/profile', isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
        // Fetch complete user data from database
        const user = await User.findById(req.user._id);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/auth/login');
        }

        const { clientId, redirectUrl } = req.query;

        if (clientId && redirectUrl) {
            try {
                const client = await Client.findOne({ clientId });
                if (!client || !client.redirectUrls.includes(redirectUrl as string)) {
                    req.flash('error', 'Invalid client or redirect URL');
                    return res.redirect('/profile');
                }

                const token = generateToken(user, client);
                return res.redirect(`${redirectUrl}?token=${token}`);
            } catch (error) {
                req.flash('error', 'Error processing client redirect');
                return res.redirect('/profile');
            }
        }

        // Format user data
        const userData = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profileImageUrl: user.profileImageUrl,
            createdAt: user.createdAt,
            googleId: user.googleId,
            facebookId: user.facebookId
        };

        res.render('user/profile', { user: userData });
    } catch (error) {
        console.error('Error fetching user data:', error);
        req.flash('error', 'Error loading profile data');
        res.redirect('/auth/login');
    }
});

export default router;
