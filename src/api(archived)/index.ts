import express from 'express';
import clientRoutes from './routes/clientRoutes';
import userRoutes from './routes/userRoutes';

const router = express.Router();

router.use('/clients', clientRoutes);
router.use('/users', userRoutes);

export default router;
