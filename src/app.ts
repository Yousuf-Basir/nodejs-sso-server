import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import { engine } from 'express-handlebars';
import session from 'express-session';
import flash from 'connect-flash';
import path from 'path';
import passport from './config/passport';
import connectDB from './config/database';

import * as middlewares from './middlewares';
import api from './api';
import authRoutes from './api/routes/authRoutes';
import userRoutes from './api/routes/userRoutes';
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
            return new Date(date).toLocaleDateString();
        }
    }
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(morgan('dev'));
app.use(helmet({
    contentSecurityPolicy: false,
    hsts: false  // Disable HTTP Strict Transport Security
}));
app.use(cors({
    origin: '*',
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

// Passport middleware
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

// Routes
app.get<{}, MessageResponse>('/', (req, res) => {
    res.render('home');
});

app.use('/auth', authRoutes);
app.use('/', userRoutes);
app.use('/api/v1', api);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default app;
