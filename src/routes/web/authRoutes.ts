import express, { Response } from 'express';
import passport from 'passport';
import { isGuest, AuthRequest, generateToken } from '../../middlewares/auth';
import Client from '../../models/Client';

const router = express.Router();

// Login page
router.get('/login', async (req: AuthRequest, res: Response) => {
    const { clientId, redirectUrl } = req.query;

    // If user is already authenticated and has clientId/redirectUrl, generate token and redirect
    if (req.isAuthenticated() && clientId && redirectUrl) {
        try {
            const client = await Client.findOne({ clientId });
            if (!client || !client.redirectUrls.includes(redirectUrl as string)) {
                req.flash('error', 'Invalid client or redirect URL');
                return res.redirect('/profile');
            }

            const token = generateToken(req.user, client);
            return res.redirect(`${redirectUrl}?token=${token}`);
        } catch (error) {
            console.error('Error processing client redirect:', error);
            req.flash('error', 'Error processing client redirect');
            return res.redirect('/profile');
        }
    }

    // If user is authenticated but no client info, redirect to profile
    if (req.isAuthenticated()) {
        return res.redirect('/profile');
    }

    // Not authenticated, show login page
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

// Handle login form submission
router.post('/login', (req: AuthRequest, res: Response, next) => {
    const { clientId, redirectUrl } = req.query;
    passport.authenticate('local', async (err: any, user: any, info: any) => {
        if (err) {
            req.flash('error', 'An error occurred during authentication');
            return res.redirect(`/auth/login?clientId=${clientId}&redirectUrl=${redirectUrl}`);
        }

        if (!user) {
            req.flash('error', info.message || 'Invalid credentials');
            return res.redirect(`/auth/login?clientId=${clientId}&redirectUrl=${redirectUrl}`);
        }

        req.logIn(user, async (loginErr) => {
            if (loginErr) {
                req.flash('error', 'An error occurred during login');
                return res.redirect('/auth/login');
            }

            const { clientId, redirectUrl } = req.body;

            if (clientId && redirectUrl) {
                try {
                    const client = await Client.findOne({ clientId });
                    if (!client || !client.redirectUrls.includes(redirectUrl)) {
                        req.flash('error', 'Invalid client or redirect URL');
                        return res.redirect('/auth/login');
                    }

                    const token = generateToken(user, client);
                    return res.redirect(`${redirectUrl}?token=${token}`);
                } catch (error) {
                    console.error('Error processing client redirect:', error);
                    req.flash('error', 'Error processing client redirect');
                    return res.redirect('/auth/login');
                }
            }

            // If no client/redirect URL, go to profile
            req.session.save((err) => {
                if (err) {
                    console.error('Error saving session:', err);
                    req.flash('error', 'An error occurred during login');
                    return res.redirect('/auth/login');
                }
                res.redirect('/profile');
            });
        });
    })(req, res, next);
});

// Google authentication routes
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

// Logout route
router.get('/logout', async (req: AuthRequest, res: Response) => {
    const { clientId, redirectUrl } = req.query;

    // Function to handle redirect after logout
    const handleRedirect = () => {
        if (clientId && redirectUrl) {
            try {
                // Verify client and redirect URL
                Client.findOne({ clientId }).then(client => {
                    if (client && client.redirectUrls.includes(redirectUrl as string)) {
                        res.redirect(redirectUrl as string);
                    } else {
                        res.redirect('/auth/login');
                    }
                }).catch(err => {
                    console.error('Error verifying client:', err);
                    res.redirect('/auth/login');
                });
            } catch (error) {
                console.error('Error during logout redirect:', error);
                res.redirect('/auth/login');
            }
        } else {
            res.redirect('/auth/login');
        }
    };

    // Logout user
    req.logout((err) => {
        if (err) {
            console.error('Error during logout:', err);
        }
        req.session.destroy((sessionErr) => {
            if (sessionErr) {
                console.error('Error destroying session:', sessionErr);
            }
            handleRedirect();
        });
    });
});

// Register page
router.get('/register', isGuest, (req: AuthRequest, res: Response) => {
    const { clientId, redirectUrl } = req.query;
    const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const facebookEnabled = Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
    const socialLoginEnabled = googleEnabled || facebookEnabled;
    
    res.render('auth/register', {
        clientId,
        redirectUrl,
        googleEnabled,
        facebookEnabled,
        socialLoginEnabled
    });
});

export default router;
