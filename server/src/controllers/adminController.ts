import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';

const toSafeUser = (user: User) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  isActive: user.isActive,
  role: user.role,
  isDeleted: user.isDeleted,
  deletedAt: user.deletedAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

export class AdminController {
  static async getUsers(req: Request, res: Response) {
    try {
      const userRepository = AppDataSource.getRepository(User);
      const users = await userRepository.find({
        where: { isDeleted: false },
        order: { createdAt: 'DESC' }
      });

      res.json(users.map(toSafeUser));
    } catch (error) {
      console.error('Admin get users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { isActive, role } = req.body;

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { id } });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.username === 'admin') {
        if (isActive === false) {
          return res.status(400).json({ error: 'Built-in admin cannot be deactivated' });
        }
        if (role && role !== 'admin') {
          return res.status(400).json({ error: 'Built-in admin cannot be changed to a normal user' });
        }
      }

      if (req.user?.id === user.id && isActive === false) {
        return res.status(400).json({ error: 'You cannot deactivate your own account' });
      }

      if (typeof isActive === 'boolean') {
        user.isActive = isActive;
      }

      if (role) {
        if (!['user', 'admin'].includes(role)) {
          return res.status(400).json({ error: 'Invalid role' });
        }

        if (req.user?.id === user.id && role !== 'admin') {
          return res.status(400).json({ error: 'You cannot remove your own admin role' });
        }

        user.role = role;
      }

      const savedUser = await userRepository.save(user);
      res.json(toSafeUser(savedUser));
    } catch (error) {
      console.error('Admin update user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { password } = req.body;

      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { id } });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      user.password = await bcrypt.hash(password, 12);
      await userRepository.save(user);

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Admin reset password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deleteUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      if (req.user?.id === id) {
        return res.status(400).json({ error: 'You cannot delete your own account' });
      }

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { id } });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.username === 'admin') {
        return res.status(400).json({ error: 'Built-in admin cannot be deleted' });
      }

      user.isActive = false;
      user.isDeleted = true;
      user.deletedAt = new Date();

      await userRepository.save(user);

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Admin delete user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
