const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const checkEventOwnership = require('../middleware/checkEventOwnership');

router.post('/createEvent', eventController.createEvent);
router.post('/:eventId/invite', eventController.connexionLinkInvitation);
router.post('/:eventId/tricount/:token/createExpense', eventController.createExpense);
router.post('/:eventId/messaging/:token/createPost', eventController.createPost);
router.post('/:eventId/messaging/:token/post/:postId/createDiscussion', eventController.createDiscussion);

router.get('/listEvents/:email', eventController.getListEvents);
router.get('/:eventId/infoEvent/:token?', eventController.getInfoEvent);
router.get('/:eventId/responsesParticipant', eventController.getEventParticipantsAndResponses);
router.get('/:eventId/listParticipants', eventController.getListParticipants);
router.get('/:eventId/favoriteDate', eventController.favoriteDate);
router.get('/:eventId/tricount/listExpenses', eventController.getListExpenses);
router.get('/:eventId/tricount/balancing', eventController.getBalancing);
router.get('/:eventId/tricount/payParticipant', eventController.getPayParticipant);
router.get('/:eventId/tricount/:expenseId/infoExpense', eventController.getInfoExpense);
router.get('/:eventId/messaging/listPost', eventController.getListPost);
router.get('/:eventId/messaging/post/:postId/listDiscussion', eventController.getListDiscussion);

router.delete('/:eventId/tricount/:expenseId/deleteExpense', eventController.deleteExpense);

router.put('/:eventId/user/:userToken/updateEvent', checkEventOwnership, eventController.updateEvent);
router.put('/:eventId/tricount/:expenseId/updateExpense', eventController.updateExpense);

module.exports = router;