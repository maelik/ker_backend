// middleware/checkEventOwnership.js

const { Event, User } = require('../models');  // Importer les modèles nécessaires

// Middleware pour vérifier si l'utilisateur est le créateur de l'événement
module.exports = async (req, res, next) => {
    
  const { eventId, userToken } = req.params;

  if (!eventId || !userToken) {
    return res.status(400).json({ error: 'Missing eventId or userToken' });
  }

  try {
    // Chercher l'événement dans la base de données
    const event = await Event.findByPk(eventId);

    // Vérifier si l'événement existe
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Trouver l'utilisateur associé à cet ID unique (token)
    const user = await User.findOne({ where: { token: userToken } });

    // Vérifier si l'utilisateur existe
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Vérifier si l'utilisateur est bien le créateur de l'événement
    if (event.userId !== user.id) {
      return res.status(403).json({ message: 'You do not have permission to modify this event' });
    }

    // Si tout est bon, passer au middleware suivant ou au contrôleur
    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ message: 'Failed to check permissions' });
  }
};
