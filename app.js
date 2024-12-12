require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const userRoutes = require('./routes/userRoutes');
const eventRoutes = require('./routes/eventRoutes');
const guestRoutes = require('./routes/guestRoutes');
const http = require('http');
const WebSocket = require('ws');

const app = express();

// Crée un serveur HTTP
const server = http.createServer(app);

// Crée un serveur WebSocket
const wss = new WebSocket.Server({ server });

// Stocke le serveur WebSocket globalement (accessible dans les contrôleurs)
global.wss = wss;

// Gère les connexions WebSocket
wss.on('connection', (ws) => {
  console.log('Client WebSocket connecté');

  ws.on('message', (message) => {
    console.log('Message reçu:', message);
    
    // Exemple : envoyez un message à tous les clients connectés
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message); // Diffuser le message à tous les autres clients
      }
    });
  });

  ws.on('close', () => {
    console.log('Client WebSocket déconnecté');
  });
});

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
        server.listen(PORT, console.log(`Server running on port ${PORT}`));
    })
    .catch(err => console.log('Error: ' + err));