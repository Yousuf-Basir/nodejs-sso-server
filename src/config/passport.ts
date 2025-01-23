import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import User from '../models/User';
require('dotenv').config();

// Ensure environment variables are loaded
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('Missing Google OAuth credentials. Please check your .env file');
}

if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    console.error('Missing Facebook OAuth credentials. Please check your .env file');
}

passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Local Strategy
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        const user = await User.findOne({ email });
        
        if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
        }

        const isMatch = bcrypt.compare(password, user.password as string);
        
        if (!isMatch) {
            return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));

// Google Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.APP_URL + '/auth/google/callback',
        passReqToCallback: true
    }, async (req: any, accessToken, refreshToken, profile, done) => {
        try {
            const { clientId, redirectUrl } = req.query;
            
            // Check if user exists
            let user = await User.findOne({ email: profile.emails?.[0].value });

            if (!user) {
                // Create new user
                user = new User({
                    username: profile.displayName,
                    email: profile.emails?.[0].value,
                    profileImageUrl: profile.photos?.[0].value,
                    googleId: profile.id,
                    clientId: clientId || null
                });
                await user.save();
            }

            // Store clientId and redirectUrl in session for callback
            if (clientId && redirectUrl) {
                req.session.clientId = clientId;
                req.session.redirectUrl = redirectUrl;
            }

            return done(null, user);
        } catch (error) {
            return done(error as Error, undefined);
        }
    }));
}

// Facebook Strategy
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: process.env.APP_URL + '/auth/facebook/callback',
        profileFields: ['id', 'displayName', 'photos', 'email'],
        passReqToCallback: true
    }, async (req: any, accessToken, refreshToken, profile, done) => {
        try {
            const { clientId, redirectUrl } = req.query;
            
            // Check if user exists
            let user = await User.findOne({ email: profile.emails?.[0].value });

            if (!user) {
                // Create new user
                user = new User({
                    username: profile.displayName,
                    email: profile.emails?.[0].value,
                    profileImageUrl: profile.photos?.[0].value,
                    facebookId: profile.id,
                    clientId: clientId || null
                });
                await user.save();
            }

            // Store clientId and redirectUrl in session for callback
            if (clientId && redirectUrl) {
                req.session.clientId = clientId;
                req.session.redirectUrl = redirectUrl;
            }

            return done(null, user);
        } catch (error) {
            return done(error as Error, undefined);
        }
    }));
}

export default passport; 