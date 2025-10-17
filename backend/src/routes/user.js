import { Router } from 'express';
import {
    allUsers,
    getUserById,
    updateUser,
    deleteUser,
    searchUsers
} from '../controllers/user.js';

const router = Router();

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Public (should be protected in production)
 */
router.get('/users', allUsers);

/**
 * @route   GET /api/users/search
 * @desc    Search users by email or name
 * @access  Public
 * @query   { q: string }
 */
router.get('/users/search', searchUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Public
 */
router.get('/users/:id', getUserById);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user information
 * @access  Public (should verify ownership in production)
 * @body    { fullName?: string, phoneNumber?: string }
 */
router.put('/users/:id', updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete a user
 * @access  Public (should be admin only in production)
 */
router.delete('/users/:id', deleteUser);

export default router;
