import { Request, Response, NextFunction } from 'express';
import { Session } from 'express-session';
import Client from '../models/Client';
import jwt from 'jsonwebtoken';

interface CustomSession extends Session {
    user?: any;
}

export interface AuthRequest extends Request {
    user?: any;
    client?: any;
    session: CustomSession;
    flash: {
        (type: string, message: string | string[]): number;
        (type: string, format: string, ...args: any[]): number;
        (message: string): string[];
        (): { [key: string]: string[]; };
    };
}

export const verifyClient = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { clientId, redirectUrl } = req.query;

    if (!clientId || !redirectUrl) {
        return res.status(400).render('error', {
            message: 'Client ID and redirect URL are required'
        });
    }

    try {
        const client = await Client.findOne({ clientId });
        if (!client) {
            return res.status(400).render('error', {
                message: 'Invalid client ID'
            });
        }

        if (!client.redirectUrls.includes(redirectUrl as string)) {
            return res.status(400).render('error', {
                message: 'Invalid redirect URL'
            });
        }

        req.client = client;
        next();
    } catch (error) {
        res.status(500).render('error', {
            message: 'Server error'
        });
    }
};

export const generateToken = (user: any, client: any) => {
    return jwt.sign(
        { 
            userId: user._id,
            clientId: client.clientId,
            username: user.username,
            email: user.email
        },
        process.env.JWT_SECRET || 'your-jwt-secret',
        { expiresIn: '1h' }
    );
};

export const isAuthenticated = (req: AuthRequest, res: Response, next: NextFunction) => {
    console.log('Session:', req.session);
    console.log('User:', req.user);
    console.log('Is Authenticated:', req.isAuthenticated());

    if (req.isAuthenticated()) {
        return next();
    }

    // Check if it's an API request (based on path or Accept header)
    const isApiRequest = req.path.startsWith('/api') || req.accepts('json');

    if (isApiRequest) {
        return res.status(401).json({
            status: 'error',
            message: 'Authentication required'
        });
    }

    // For web requests, redirect to login
    req.flash('error', 'Please log in to access this page');
    res.redirect('/auth/login');
};

export const isGuest = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.session || !req.session.user) {
        return next();
    }

    const { clientId, redirectUrl } = req.query;
    if (clientId && redirectUrl) {
        return res.redirect(`/profile?clientId=${clientId}&redirectUrl=${redirectUrl}`);
    }
    
    res.redirect('/profile');
}; 