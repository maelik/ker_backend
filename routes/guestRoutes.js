const express = require('express');
const router = express.Router();
const guestController = require('../controllers/guestController');

router.post('/:token/event/:eventId/response', guestController.respondToInvitation);
router.get('/:token/event/:eventId/response', guestController.getResponses);

module.exports = router;
