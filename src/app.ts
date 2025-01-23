import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import { engine } from 'express-handlebars';
import session from 'express-session';
import flash from 'connect-flash';
import path from 'path';
import passport from 'passport';
import './config/passport';
import connectDB from './config/database';

import * as middlewares from './middlewares';
import MessageResponse from './interfaces/MessageResponse';

require('dotenv').config();

const app = express();

// Connect to MongoDB
connectDB();

// View engine setup
app.engine('handlebars', engine({
    defaultLayout: 'main',
    helpers: {
        formatDate: (date: Date) => {
            if (!date) return 'N/A';
            const d = new Date(date);
            if (isNaN(d.getTime())) return 'Invalid Date';
            return d.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(morgan('dev'));
// app.use(helmet({
//     contentSecurityPolicy: false,
//     hsts: false  // Disable HTTP Strict Transport Security
// }));

// Configure CORS
app.use(cors({
    origin: true, // Allow all origins
    credentials: true, // Important: Allow credentials
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,  // Allow HTTP
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize passport and session
app.use(passport.initialize());
app.use(passport.session());

// Flash messages
app.use(flash());

// Global variables
app.use((req, res, next) => {
    res.locals.messages = {
        success: req.flash('success'),
        error: req.flash('error')
    };
    res.locals.user = req.user;
    next();
});

// Import routes
import webAuthRoutes from './routes/web/authRoutes';
import webUserRoutes from './routes/web/userRoutes';
import apiAuthRoutes from './routes/api/authRoutes';
import apiUserRoutes from './routes/api/userRoutes';

// Web routes - HTML responses
app.use('/auth', webAuthRoutes);
app.use('/', webUserRoutes);

// API routes - JSON responses
app.use('/api/auth', apiAuthRoutes);
app.use('/api/users', apiUserRoutes);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default app;
