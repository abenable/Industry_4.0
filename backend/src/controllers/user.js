import { ApiError } from './error.js';
import logger from '../utils/logger.js';
import { prisma } from '../index.js';

/**
 * Get all users (basic info only)
 */
export const allUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      status: 'success',
      count: users.length,
      data: users,
    });
  } catch (error) {
    logger.error(`Error fetching users: ${error.message}`);
    next(new ApiError(500, error.message));
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new ApiError(400, 'User ID is required'));
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      return next(new ApiError(404, 'User not found'));
    }

    res.json({
      status: 'success',
      data: user
    });
  } catch (error) {
    logger.error(`Error fetching user: ${error.message}`);
    next(new ApiError(500, error.message));
  }
};

/**
 * Update user information
 */
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fullName, phoneNumber } = req.body;

    if (!id) {
      return next(new ApiError(400, 'User ID is required'));
    }

    // Build update data object (only include provided fields)
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

    if (Object.keys(updateData).length === 0) {
      return next(new ApiError(400, 'No fields to update'));
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    logger.info(`User ${id} updated successfully`);

    res.json({
      status: 'success',
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return next(new ApiError(404, 'User not found'));
    }
    if (error.code === 'P2002') {
      return next(new ApiError(400, 'Phone number already in use'));
    }
    logger.error(`Error updating user: ${error.message}`);
    next(new ApiError(500, error.message));
  }
};

/**
 * Delete user
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new ApiError(400, 'User ID is required'));
    }

    // Delete user (will cascade delete history due to schema)
    await prisma.user.delete({
      where: { id },
    });

    logger.info(`User ${id} deleted successfully`);

    res.json({
      status: 'success',
      message: 'User and associated history deleted successfully'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return next(new ApiError(404, 'User not found'));
    }
    logger.error(`Error deleting user: ${error.message}`);
    next(new ApiError(500, error.message));
  }
};

/**
 * Search users by email or name
 */
export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return next(new ApiError(400, 'Search query is required'));
    }

    const searchTerm = q.trim();

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { fullName: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      take: 50, // Limit results
      orderBy: {
        createdAt: 'desc'
      }
    });

    logger.info(`Found ${users.length} users matching: ${searchTerm}`);

    res.json({
      status: 'success',
      count: users.length,
      data: users
    });
  } catch (error) {
    logger.error(`Error searching users: ${error.message}`);
    next(new ApiError(500, error.message));
  }
};
