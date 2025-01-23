import { Request, Response } from 'express';
import User from '../../models/User';

// Register new user
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { username, email, password, clientId } = req.body;
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    
    if (userExists) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = new User({ username, email, password, clientId });
    await user.save();

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      clientId: user.clientId,
      profileImageUrl: user.profileImageUrl
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Get all users for a client
export const getUsers = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const users = await User.find({ clientId }).select('-password');
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { username, email, profileImageUrl } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { username, email, profileImageUrl },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Delete user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Authenticate user
export const authenticateUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      clientId: user.clientId,
      profileImageUrl: user.profileImageUrl
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}; 