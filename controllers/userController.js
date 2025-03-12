const { User } = require('../models');
const crypto = require('crypto');

exports.createUser = async (req, res) => {
  try {
    
    const { email } = req.body;

    // Vérification que l'email
    if (typeof email !== 'string' || email.trim() === '') {
      return res.status(400).json({ error: 'Email must be a valid string' });
    }
    
    let user = await User.findOne({
      where: { email }
    });

    if (!user) {
      const token = crypto.randomBytes(16).toString('hex');
    
      user = await User.create({
        email,
        token
      });
    }

    res.status(201).json(user);
  } catch (error) {
    console.error('Error during user creation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.listUser = async (req, res) => {
  try {
    
    let users = await User.findAll();

    res.status(201).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
