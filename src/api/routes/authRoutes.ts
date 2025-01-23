import express, { Response } from 'express';
import passport from 'passport';
import { isGuest, isAuthenticated, AuthRequest, verifyClient, generateToken } from '../../middlewares/auth';
import User from '../../models/User';
import Client from '../../models/Client';

const router = express.Router();

// Social Login Routes
router.get('/google', (req: AuthRequest, res: Response, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        req.flash('error', 'Google login is not configured');
        return res.redirect('/auth/login');
    }

    const { clientId, redirectUrl } = req.query;
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: JSON.stringify({ clientId, redirectUrl })
    })(req, res, next);
});

router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: '/auth/login', failureFlash: true }),
    async (req: AuthRequest, res: Response) => {
        try {
            if (!req.user) {
                req.flash('error', 'Authentication failed');
                return res.redirect('/auth/login');
            }

            // Set user session
            req.session.user = {
                _id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                profileImageUrl: req.user.profileImageUrl,
                createdAt: req.user.createdAt
            };

            // Get state from query parameter
            const stateParam = req.query.state as string;
            if (!stateParam) {
                return res.redirect('/profile');
            }

            try {
                const { clientId, redirectUrl } = JSON.parse(stateParam);
                if (clientId && redirectUrl) {
                    const client = await Client.findOne({ clientId });
                    if (!client || !client.redirectUrls.includes(redirectUrl)) {
                        req.flash('error', 'Invalid client or redirect URL');
                        return res.redirect('/profile');
                    }
                    const token = generateToken(req.user, client);
                    return res.redirect(`${redirectUrl}?token=${token}`);
                }
            } catch (parseError) {
                console.error('Error parsing state:', parseError);
            }

            res.redirect('/profile');
        } catch (error) {
            console.error('Callback error:', error);
            req.flash('error', 'An error occurred during authentication');
            res.redirect('/auth/login');
        }
    }
);

router.get('/facebook', (req: AuthRequest, res: Response, next) => {
    if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
        req.flash('error', 'Facebook login is not configured');
        return res.redirect('/auth/login');
    }

    const { clientId, redirectUrl } = req.query;
    passport.authenticate('facebook', {
        scope: ['email', 'public_profile'],
        state: JSON.stringify({ clientId, redirectUrl })
    })(req, res, next);
});

router.get('/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/auth/login', failureFlash: true }),
    async (req: AuthRequest, res: Response) => {
        try {
            if (!req.user) {
                req.flash('error', 'Authentication failed');
                return res.redirect('/auth/login');
            }

            // Set user session
            req.session.user = {
                _id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                profileImageUrl: req.user.profileImageUrl,
                createdAt: req.user.createdAt
            };

            // Get state from query parameter
            const stateParam = req.query.state as string;
            if (!stateParam) {
                return res.redirect('/profile');
            }

            try {
                const { clientId, redirectUrl } = JSON.parse(stateParam);
                if (clientId && redirectUrl) {
                    const client = await Client.findOne({ clientId });
                    if (!client || !client.redirectUrls.includes(redirectUrl)) {
                        req.flash('error', 'Invalid client or redirect URL');
                        return res.redirect('/profile');
                    }
                    const token = generateToken(req.user, client);
                    return res.redirect(`${redirectUrl}?token=${token}`);
                }
            } catch (parseError) {
                console.error('Error parsing state:', parseError);
            }

            res.redirect('/profile');
        } catch (error) {
            console.error('Callback error:', error);
            req.flash('error', 'An error occurred during authentication');
            res.redirect('/auth/login');
        }
    }
);

// Login page
router.get('/login', isGuest, (req: AuthRequest, res: Response) => {
    const { clientId, redirectUrl } = req.query;
    const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const facebookEnabled = Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
    const socialLoginEnabled = googleEnabled || facebookEnabled;

    res.render('auth/login', { 
        clientId, 
        redirectUrl,
        googleEnabled,
        facebookEnabled,
        socialLoginEnabled
    });
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
    const { clientId, redirectUrl } = req.query;
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        
        if (clientId && redirectUrl) {
            console.log('Redirecting to client URL:', redirectUrl);
            return res.redirect(redirectUrl as string);
        }
        res.redirect('/');
    });
});

export default router; 