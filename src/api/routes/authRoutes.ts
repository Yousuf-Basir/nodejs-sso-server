import express, { Response } from 'express';
import { isGuest, isAuthenticated, AuthRequest, verifyClient, generateToken } from '../../middlewares/auth';
import User from '../../models/User';
import Client from '../../models/Client';

const router = express.Router();

// Login page
router.get('/login', isGuest, (req: AuthRequest, res: Response) => {
    const { clientId, redirectUrl } = req.query;
    res.render('auth/login', { clientId, redirectUrl });
});

// Register page
router.get('/register', isGuest, (req: AuthRequest, res: Response) => {
    const { clientId, redirectUrl } = req.query;
    res.render('auth/register', { clientId, redirectUrl });
});

// Handle login
router.post('/login', isGuest, async (req: AuthRequest, res: Response) => {
    const { email, password, clientId, redirectUrl } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error', 'Invalid credentials');
            return res.redirect(`/auth/login?clientId=${clientId}&redirectUrl=${redirectUrl}`);
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            req.flash('error', 'Invalid credentials');
            return res.redirect(`/auth/login?clientId=${clientId}&redirectUrl=${redirectUrl}`);
        }

        // Set user session
        req.session.user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profileImageUrl: user.profileImageUrl,
            createdAt: user.createdAt
        };

        if (clientId && redirectUrl) {
            const client = await Client.findOne({ clientId });
            if (!client || !client.redirectUrls.includes(redirectUrl)) {
                req.flash('error', 'Invalid client or redirect URL');
                return res.redirect(`/auth/login?clientId=${clientId}&redirectUrl=${redirectUrl}`);
            }
            const token = generateToken(user, client);
            return res.redirect(`${redirectUrl}?token=${token}`);
        }

        console.log('User logged in:', user);

        res.redirect('/profile');
    } catch (error: any) {
        req.flash('error', error.message);
        res.redirect(`/auth/login${clientId ? `?clientId=${clientId}&redirectUrl=${redirectUrl}` : ''}`);
    }
});

// Handle register
router.post('/register', isGuest, async (req: AuthRequest, res: Response) => {
    const { username, email, password, clientId, redirectUrl } = req.body;

    try {
        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            req.flash('error', 'User already exists');
            return res.redirect(`/auth/register?clientId=${clientId}&redirectUrl=${redirectUrl}`);
        }

        const user = new User({ 
            username, 
            email, 
            password,
            clientId: clientId || null
        });
        await user.save();

        // Set user session
        req.session.user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profileImageUrl: user.profileImageUrl,
            createdAt: user.createdAt
        };

        if (clientId && redirectUrl) {
            const client = await Client.findOne({ clientId });
            if (!client || !client.redirectUrls.includes(redirectUrl)) {
                req.flash('error', 'Invalid client or redirect URL');
                return res.redirect(`/auth/register?clientId=${clientId}&redirectUrl=${redirectUrl}`);
            }
            const token = generateToken(user, client);
            return res.redirect(`${redirectUrl}?token=${token}`);
        }

        res.redirect('/profile');
    } catch (error: any) {
        req.flash('error', error.message);
        res.redirect(`/auth/register${clientId ? `?clientId=${clientId}&redirectUrl=${redirectUrl}` : ''}`);
    }
});

// Handle logout
router.get('/logout', isAuthenticated, (req: AuthRequest, res: Response) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
});

export default router; 