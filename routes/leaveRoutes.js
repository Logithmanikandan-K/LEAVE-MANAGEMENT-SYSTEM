const express = require('express');
const router = express.Router();
const User = require('../model/User');

// Route to handle user registration
router.post('/register', async (req, res) => {
    const {
        username,
        email,
        rollNumber,
        casualLeave = 0,
        medicalLeave = 0
    } = req.body;

    try {
        // Validate required fields
        if (
            typeof username !== 'string' || !username.trim() ||
            typeof email !== 'string' || !email.trim() ||
            typeof rollNumber !== 'string' || !rollNumber.trim()
        ) {
            return res.status(400).json({
                message: 'Username, email, and roll number are required.'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({
                message: 'Invalid email format.'
            });
        }

        // Validate initial leave balances
        if (
            !Number.isSafeInteger(casualLeave) ||
            !Number.isSafeInteger(medicalLeave) ||
            casualLeave < 0 ||
            medicalLeave < 0
        ) {
            return res.status(400).json({
                message: 'Leave balances must be non-negative integers.'
            });
        }

        // Check whether the email already exists
        const existingUser = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (existingUser) {
            return res.status(400).json({
                message: 'User already exists with this email.'
            });
        }

        // Create the user
        const newUser = new User({
            username: username.trim(),
            email: email.trim().toLowerCase(),
            rollNumber: rollNumber.trim(),
            casualLeave,
            medicalLeave
        });

        await newUser.save();

        return res.status(201).json({
            message: 'User created successfully.',
            userId: newUser._id,
            username: newUser.username,
            rollNumber: newUser.rollNumber,
            casualLeave: newUser.casualLeave,
            medicalLeave: newUser.medicalLeave
        });
    } catch (error) {
        console.error('Error creating user:', error);

        if (error.code === 11000) {
            return res.status(409).json({
                message: 'Email or roll number already exists.'
            });
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Invalid user details.'
            });
        }

        return res.status(500).json({
            message: 'Server error.'
        });
    }
});

// Route to handle user login
// NOTE: Email-only login is suitable only for a demo.
router.post('/login', async (req, res) => {
    const { email } = req.body;

    try {
        if (typeof email !== 'string' || !email.trim()) {
            return res.status(400).json({
                message: 'Email is required.'
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (!user) {
            return res.status(404).json({
                message: 'User not found.'
            });
        }

        return res.json({
            message: 'Login successful.',
            userId: user._id,
            username: user.username,
            rollNumber: user.rollNumber,
            casualLeave: user.casualLeave,
            medicalLeave: user.medicalLeave
        });
    } catch (error) {
        console.error('Error during login:', error);

        return res.status(500).json({
            message: 'Server error.'
        });
    }
});

// Route to get leave balance by user ID
router.get('/leave-balance/:id', async (req, res) => {
    try {
        if (!/^[a-fA-F0-9]{24}$/.test(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid user ID.'
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                message: 'User not found.'
            });
        }

        return res.json({
            casualLeave: user.casualLeave,
            medicalLeave: user.medicalLeave
        });
    } catch (error) {
        console.error('Error fetching leave balance:', error);

        return res.status(500).json({
            message: 'Server error.'
        });
    }
});

// Route to apply for leave by deducting available days
router.post('/apply-leave/:id', async (req, res) => {
    const { type, days } = req.body;

    try {
        if (!/^[a-fA-F0-9]{24}$/.test(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid user ID.'
            });
        }

        // Validate leave type
        if (type !== 'casual' && type !== 'medical') {
            return res.status(400).json({
                message: 'Invalid leave type.'
            });
        }

        // Require a positive integer
        if (
            !Number.isSafeInteger(days) ||
            days <= 0
        ) {
            return res.status(400).json({
                message: 'Number of days must be a positive integer.'
            });
        }

        const leaveField =
            type === 'casual' ? 'casualLeave' : 'medicalLeave';

        // Atomic update prevents concurrent requests from overspending
        const user = await User.findOneAndUpdate(
            {
                _id: req.params.id,
                [leaveField]: { $gte: days }
            },
            {
                $inc: { [leaveField]: -days }
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!user) {
            const existingUser = await User.findById(req.params.id);

            if (!existingUser) {
                return res.status(404).json({
                    message: 'User not found.'
                });
            }

            return res.status(400).json({
                message: `Insufficient ${type} leave balance.`
            });
        }

        return res.json({
            message: 'Leave applied successfully.',
            casualLeave: user.casualLeave,
            medicalLeave: user.medicalLeave
        });
    } catch (error) {
        console.error('Error applying for leave:', error);

        return res.status(500).json({
            message: 'Server error.'
        });
    }
});

module.exports = router;