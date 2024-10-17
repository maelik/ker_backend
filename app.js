require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const userRoutes = require('./routes/userRoutes');
const eventRoutes = require('./routes/eventRoutes');
const guestRoutes = require('./routes/guestRoutes');

const app = express();

// Utiliser le middleware CORS avec la configuration
app.use(cors());

app.use(express.json());

// Middleware pour vérifier l'ID utilisateur dans l'URL
app.use('/api/users/:token/*', async (req, res, next) => {
    const token = req.params.token;
    
    try {
      const user = await User.findByPk(token);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Attache l'utilisateur à la requête pour une utilisation ultérieure
      req.user = user;
      next();
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });

// Routes
app.use('/api/users', userRoutes);       
app.use('/api/events', eventRoutes);      
app.use('/api/guests', guestRoutes); 

// Connect to Database
sequelize.authenticate()
    .then(() => console.log('Database connected...'))
    .catch(err => console.log('Error: ' + err));

const PORT = process.env.PORT || 3000;

// Synchroniser les modèles
sequelize.sync({ alter: true })
    .then(() => {
        app.listen(PORT, console.log(`Server running on port ${PORT}`));
    })
    .catch(err => console.log('Error: ' + err));