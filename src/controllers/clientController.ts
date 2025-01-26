import { Request, Response } from 'express';
import Client from '../models/Client';

// Create new client
export const createClient = async (req: Request, res: Response) => {
  try {
    const { name, allowedOrigins, redirectUrls } = req.body;
    const client = new Client({ name, allowedOrigins, redirectUrls });
    await client.save();
    res.status(201).json(client);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Get all clients
export const getClients = async (req: Request, res: Response) => {
  try {
    const clients = await Client.find().select('-clientSecret');
    res.json(clients);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get client by ID
export const getClientById = async (req: Request, res: Response) => {
  try {
    const client = await Client.findById(req.params.id).select('-clientSecret');
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(client);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update client
export const updateClient = async (req: Request, res: Response) => {
  try {
    const { name, allowedOrigins, redirectUrls } = req.body;
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { name, allowedOrigins, redirectUrls },
      { new: true, runValidators: true }
    ).select('-clientSecret');

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(client);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Delete client
export const deleteClient = async (req: Request, res: Response) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json({ message: 'Client deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}; 