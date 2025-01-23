import express, { Response } from 'express';
import passport from 'passport';
import { AuthRequest, generateToken } from '../../middlewares/auth';
import Client from '../../models/Client';

const router = express.Router();

// Social Login API Routes
router.get('/google', (req: AuthRequest, res: Response, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.status(400).json({
            status: 'error',
            message: 'Google login is not configured'
        });
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
                return res.status(401).json({
                    status: 'error',
                    message: 'Authentication failed'
                });
            }

            // Set user session
            req.session.user = {
                _id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                profileImageUrl: req.user.profileImageUrl,
                createdAt: req.user.createdAt
            };

            const stateParam = req.query.state as string;
            if (!stateParam) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Missing state parameter'
                });
            }

            try {
                const { clientId, redirectUrl } = JSON.parse(stateParam);
                if (clientId && redirectUrl) {
                    const client = await Client.findOne({ clientId });
                    if (!client || !client.redirectUrls.includes(redirectUrl)) {
                        return res.status(400).json({
                            status: 'error',
                            message: 'Invalid client or redirect URL'
                        });
                    }
                    const token = generateToken(req.user, client);
                    return res.json({
                        status: 'success',
                        data: { token }
                    });
                }
            } catch (parseError) {
                console.error('Error parsing state:', parseError);
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid state parameter'
                });
            }
        } catch (error) {
            console.error('Callback error:', error);
            return res.status(500).json({
                status: 'error',
                message: 'An error occurred during authentication'
            });
        }
    }
);

// Similar structure for Facebook routes
router.get('/facebook', (req: AuthRequest, res: Response, next) => {
    if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
        return res.status(400).json({
            status: 'error',
            message: 'Facebook login is not configured'
        });
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
        // Similar implementation as Google callback
        // Return JSON response instead of redirects
    }
);

export default router;
