const { User } = require('../models');
const crypto = require('crypto');

exports.createUser = async (req, res) => {
  try {
    
    const { email } = req.body;

    // Vérification que l'email
    if (!email) {
      return res.status(400).json({ error: 'Email are required' });
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
    res.status(500).json({ error: error.message });
  }
};