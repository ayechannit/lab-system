const PointTransaction = require('../models/pointTransactionModel');
const User = require('../models/userModel');

const getAllTransactions = async (req, res) => {
  try {
    let targetUserId = req.query.user_id;
    const isStaffOrAdmin = ['admin', 'manager'].includes(req.user?.role);

    if (targetUserId) {
      if (targetUserId !== req.user.id && !isStaffOrAdmin) {
        return res.status(403).json({ message: 'Access denied: cannot view other users point transactions' });
      }
    } else {
      if (!isStaffOrAdmin) {
        targetUserId = req.user.id;
      }
    }

    const transactions = targetUserId 
      ? await PointTransaction.getByUserId(targetUserId)
      : await PointTransaction.getAll();

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createManualAdjustment = async (req, res) => {
  try {
    const { user_id, points, transaction_type, description } = req.body;
    
    if (!user_id || points === undefined || !transaction_type) {
      return res.status(400).json({ message: 'user_id, points, and transaction_type are required' });
    }

    const pointsInt = parseInt(points, 10);
    if (isNaN(pointsInt)) {
      return res.status(400).json({ message: 'points must be a valid integer' });
    }

    const allowedTypes = ['earn', 'redeem', 'adjustment'];
    if (!allowedTypes.includes(transaction_type)) {
      return res.status(400).json({ message: 'transaction_type must be one of: earn, redeem, adjustment' });
    }

    // Verify user exists
    const user = await User.getById(user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent negative balances if redeeming or subtracting points
    if (pointsInt < 0 && (user.total_points || 0) + pointsInt < 0) {
      return res.status(400).json({ 
        message: `Insufficient points: User currently has ${user.total_points || 0} points, cannot deduct ${Math.abs(pointsInt)} points` 
      });
    }

    const updatedUser = await User.addPoints(
      user_id,
      pointsInt,
      req.user?.id,
      transaction_type,
      description || `Manual point adjustment: ${pointsInt >= 0 ? '+' : ''}${pointsInt}`,
      null
    );

    res.status(201).json({
      message: 'Point adjustment applied successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        total_points: updatedUser.total_points
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllTransactions,
  createManualAdjustment
};
