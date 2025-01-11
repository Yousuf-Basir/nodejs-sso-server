import express from 'express';
import {
  registerUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  authenticateUser
} from '../controllers/userController';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', authenticateUser);
router.get('/client/:clientId', getUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router; 