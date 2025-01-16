import express from 'express';
import {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient
} from '../controllers/clientController';
import { isAuthenticated } from '../../middlewares/auth';

const router = express.Router();

// Make create client endpoint public
router.post('/', createClient);

// Keep other endpoints protected
router.get('/', isAuthenticated, getClients);
router.get('/:id', isAuthenticated, getClientById);
router.put('/:id', isAuthenticated, updateClient);
router.delete('/:id', isAuthenticated, deleteClient);

export default router;