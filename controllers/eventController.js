const { Event, EventDate, User, Guest, Invitation, GuestResponse, Expense, ExpenseParticipant, Balancing, Post, Discussion } = require('../models');
const crypto = require('crypto');
const { sequelize } = require('../models');
const { fn, col, Transaction, Op } = require('sequelize');
const { log } = require('console');
const WebSocket = require('ws');

exports.createEvent = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { title, description, userName, location, userId, dates } = req.body;

    if (!title || !userName || !userId || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ message: 'All fields are required and dates must be an array.' });
    }
    
    // Création de l'événement
    const event = await Event.create({
      title,
      description,
      userName,
      location,
      userId
    }, { transaction });

    const eventId = event.id;
    
    // Création des dates proposées
    const eventDates = dates.map(date => ({
      eventId: eventId,
      proposed_date: date.proposed_date
    }));

    await EventDate.bulkCreate(eventDates, { transaction });

    await transaction.commit();
    
    const inviteLink = `/events/${eventId}/invite`;
    res.status(201).json({ 
      'eventId': eventId, 
      'inviteLink': inviteLink
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating event with dates:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.connexionLinkInvitation = async (req, res) => {
  const { email } = req.body;
  const { eventId } = req.params;

  const transaction = await sequelize.transaction();
  
  try {
    // Trouver l'événement associé
    const event = await Event.findByPk(eventId, {transaction});
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Vérification si l'invité existe déjà
    let guest = await Guest.findOne({ where: { email },  transaction });


    if (!guest) {
        // Création d'un nouvel invité avec un ID unique
        const token = crypto.randomBytes(16).toString('hex');
        guest = await Guest.create({ email, eventId, token },  { transaction });

    }

    // Vérification si l'invitation existe déjà
    let invitation = await Invitation.findOne({ 
      where: { 
        guestId : guest.id,
        eventId: eventId
      },
      transaction
    });

    if (!invitation) {
      // Créer une invitation pour cet invité
      invitation = await Invitation.create({
        eventId: eventId,
        guestId: guest.id,
      },  { transaction });

    }
    await transaction.commit();

    res.status(201).json({
      'guest' : guest,
      'invitation' : invitation
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error handling invitation:', error);
    res.status(500).json({ message: 'Failed to handle invitation' });
  }
};

exports.getListEvents = async (req, res) => {
    try {
      const { email } = req.params;

      const creator = await User.findOne({ where: { email } });
      const userToken = creator ? creator.token : '';
      const eventsCreated = creator ? await Event.findAll({
        where: { userId: creator.id },
        attributes: ['id', 'title'],
      }) : [];

      const guest = await Guest.findOne({ where: { email } });
      const guestToken = guest ? guest.token : '';
      const eventsInvited = guest ? await Invitation.findAll({
        where: { guestId: guest.id },
        include: [{
          model: Event,
          attributes: ['id', 'title'],
        }],
      }).then(tabInvitations => tabInvitations.map(invitation => invitation.Event)) : [];

      res.status(201).json({
        'eventsCreated' : eventsCreated,
        'userToken' : userToken,
        'eventsInvited': eventsInvited,
        'guestToken' : guestToken
      });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getInfoEvent = async (req, res) => {
  const { eventId, token } = req.params;

  try {
    let event = await Event.findOne({
      where : {
        id : eventId
      },
      include: [
        {
          model: EventDate,
        },
        {
          model: User,
          attributes: ['token']
        }
      ]
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    event = event.toJSON(); // Convertir Sequelize à un objet simple
    event.EventDates.forEach((date) => {
      if (date.proposed_date) {
        date.proposed_date = new Intl.DateTimeFormat('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }).format(new Date(date.proposed_date));
      }
    });

    const view = token && token === event.User.token ? 'user' : 'guest';

    res.status(200).json({ event, view });

  } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
  }
}

exports.getEventParticipantsAndResponses = async (req, res)  => {
  const { eventId }= req.params;
  
  try {
    const event = await Event.findByPk(eventId, {
      include: [
        {
          model: Invitation,
          attributes: ['guestName', 'accepted'],
          include: [
            {
              model: GuestResponse,
              include: [
                {
                  model: EventDate,
                  attributes: ['proposed_date'],
                },
              ],
              attributes: ['response', 'order'],
            },
          ],
        },
      ],
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Tri manuel des GuestResponses
    event.Invitations.forEach(invitation => {
      invitation.GuestResponses.sort((a, b) => a.order - b.order);
    });

    
    const canCome = event.Invitations.filter(participant => participant.accepted === true);
    const cannotCome = event.Invitations.filter(participant => participant.accepted === false);

    res.status(200).json({
      canCome,
      cannotCome,
    });
  } catch (error) {
    console.error('Error fetching event participants:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getListParticipants = async (req, res)  => {
  const { eventId }= req.params;

  try {
    const event = await Event.findByPk(eventId, {
      include: [
        {
          model: Invitation,
          where: { accepted: true },
          attributes: ['guestName', 'guestId'],
        },
        {
          model: User,
          attributes: ['id'], // Ajout de userName pour l'inclusion
        },
      ],
      attributes: ['userName'],
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const listParticipants = [
      {
        name: event.userName,
        id: event.User.id,
        type: 'user',
      },
      ...event.Invitations.map(participant => ({
        name: participant.guestName,
        id: participant.guestId,
        type: 'guest',
      })),
    ];

    res.status(200).json({ listParticipants });
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ error: error.message });
  }
};

function validateEventData(data) {
  const { title, userName, description, location, eventDates } = data;

  // Vérifier que le titre est une chaîne de caractères et non vide
  if (typeof title !== 'string' || title.trim() === '') {
    return 'Title is required and must be a non-empty string.';
  }

  // Vérifier que le nom de l'utilisateur est une chaîne de caractères et non vide
  if (typeof userName !== 'string' || userName.trim() === '') {
    return 'User name is required and must be a non-empty string.';
  }

  // Vérifier que la description est une chaîne de caractères
  if (description && typeof description !== 'string') {
    return 'Description must be a string.';
  }

  // Vérifier que l'emplacement est une chaîne de caractères
  if (location && typeof location !== 'string') {
    return 'Location must be a string.';
  }

  // Si toutes les validations passent, retourner null
  return null;
}

exports.updateEvent = async (req, res) => {
  const { eventId } = req.params;
  const { title, userName, description, location } = req.body;

  const validationError = validateEventData(req.body);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    // Trouver l'événement à mettre à jour
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Mettre à jour l'événement avec les nouvelles données
    Object.assign(event, { title, userName, description, location });

    // Sauvegarder les modifications
    await event.save();

    //foreach le tableau des dates
    //regarder si elle existe
    //si non ajouter la date
    
    // en commentaire pour l'instant car ajouter une date ou la supprimer oblige aux invités de révoter
    /* for (let date of eventDates) {
      const existingDate = await EventDate.findOne({
        where: { eventId: eventId, proposed_date: date.proposed_date }
      });
      if (!existingDate) {
        await EventDate.create({ eventId: eventId, proposed_date: date.proposed_date, score: date.score });
      }
    } */

    res.status(200).json({ message: 'Event updated successfully', event });
  } catch (error) {
    console.error('Failed to update event:', error);
    res.status(500).json({ message: 'Failed to update event' });
  }
};

function validateExpenseData({ amount, description, date, payerId, payerType, participants }) {
  if (!amount || isNaN(amount) || amount <= 0) {
    return 'Amount must be a valid positive number.';
  }

  if (!description || typeof description !== 'string' || description.trim() === '') {
    return 'Description is required and must be a non-empty string.';
  }
  
  if (!date || isNaN(Date.parse(date))) {
    return 'Date is required and must be a valid date.';
  }
  
  if (!payerId || isNaN(payerId)) {
    return 'PayerId is required.';
  }

  if (!payerType || typeof payerType !== 'string' || payerType.trim() === '') {
    return 'PayerType is required and must be a non-empty string.';
  }

  if (!participants || !Array.isArray(participants) || participants.length === 0) {
    return 'Participants must be a non-empty array.';
  }

  for (const participant of participants) {
    if (!participant.id || !participant.type || !['user', 'guest'].includes(participant.type)) {
      return 'Each participant must have a valid id and type (either "user" or "guest").';
    }
  }

  return null;
}

exports.createExpense = async (req, res) => {
  const { eventId } = req.params;
  const { amount, description, date, payerId, payerType, distribution, participants } = req.body;
  

  // Validation des données
  const validationError = validateExpenseData({ amount, description, date, payerId, payerType, participants });
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  // Commencer une transaction
  const transaction = await sequelize.transaction();

  try {
    // Trouver l'événement
    const event = await Event.findByPk(eventId,  { transaction });


    if (!event) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Event not found' });
    } 

    // Créer la dépense
    const expense = await Expense.create({
      amount,
      description,
      date,
      payerType,
      eventId,
      payerId,
      distribution
    }, { transaction });

    // Préparer les données pour les participants
    const expenseParticipants = participants.map(participant => ({
      expenseId: expense.id,
      participantId: participant.id,
      participantType: participant.type,
      shareValue: amount / participants.length,
    }));

    // Insérer les participants en une seule requête
    await ExpenseParticipant.bulkCreate(expenseParticipants, { transaction });

    // Valider la transaction
    await transaction.commit();

    //fonction qui donne le tableau des participant et de leur solde
    const tabPayParticipant = await getTabPayParticipant(eventId);

    //fonction qui génère les transactions pour les remboursements
    await generateTransactions(tabPayParticipant, eventId);
    

    res.status(200).json({ message: 'Expense created successfully', expense });
  } catch (error) {
    // Annuler la transaction en cas d'erreur
    await transaction.rollback();

    console.error('Failed to create expense:', error);
    res.status(500).json({ message: 'Failed to create expense' });
  }
};

const getTabPayParticipant = async (eventId) => {
  // 1 - Récupérer les participants d'un événement
  const event = await Event.findByPk(eventId, {
    include: [
      {
        model: User,
        attributes: ['id'],
      },
      {
        model: Invitation,
        attributes: ['guestName'],
        where: { accepted: true },
        include: [
          {
            model: Guest,
            attributes: ['id'],
          },
        ],
      },
    ],
  });
  if (!event) {
    return { message: 'Pas de participant pour cet événement' };
  }

  const listParticipants = [
    {
      type: 'user',
      id: event.User.id,
      name: event.userName,
      pay: 0,
    },
  ];

  for (const invitation of event.Invitations) {
    const guest = {
      type: 'guest',
      id: invitation.Guest.id,
      name: invitation.guestName,
      pay: 0,
    };
    listParticipants.push(guest);
  }

  const expensesAsPayers = await Expense.findAll({
    where: { eventId },
    include: [
      {
        model: ExpenseParticipant,
        attributes: ['participantId', 'participantType', 'shareValue'],
      },
    ]
  });

  // Mapper les dépenses des payeurs et des participants
  const participantExpenseMap = new Map();

  for (const expense of expensesAsPayers) {
    const payerId = `${expense.payerId}-${expense.payerType}`;
    // Ajouter le montant payé par le payeur
    if (!participantExpenseMap.has(payerId)) {
      participantExpenseMap.set(payerId, expense.amount);
    } else {
      participantExpenseMap.set(payerId, participantExpenseMap.get(payerId) + expense.amount);
    }

    // Ajouter la part des participants pour cette dépense
    for (const participant of expense.ExpenseParticipants) {
      const participantKey = `${participant.participantId}-${participant.participantType}`;
      if (!participantExpenseMap.has(participantKey)) {
        participantExpenseMap.set(participantKey, -participant.shareValue);
      } else {
        participantExpenseMap.set(participantKey, participantExpenseMap.get(participantKey) - participant.shareValue);
      }
    }
  }

  // 3 - Mettre à jour la balance (pay) de chaque participant dans listParticipants
  for (const participant of listParticipants) {
    const key = `${participant.id}-${participant.type}`;
    if (participantExpenseMap.has(key)) {
      participant.pay = Math.round(participantExpenseMap.get(key) * 100) / 100;      
    }
  }
  
  return listParticipants;
};

const generateTransactions = async (tabPayParticipant, eventId) => {
  const tabCreditor = [];
  const tabDebtor = [];
  const transaction = await sequelize.transaction();

  try{
    //Supprimer toutes les transcations existante d'un event
    await Balancing.destroy({
      where: {
        eventId: eventId
      },
      transaction
    });

    for (const participant of tabPayParticipant) {
      if (participant.pay > 0) {
        tabCreditor.push(participant);
      }
  
      if (participant.pay < 0) {
        tabDebtor.push(participant);
      }
    }
  
    tabCreditor.sort((a, b) => b.pay - a.pay);
  
    tabDebtor.sort((a, b) => Math.abs(b.pay) - Math.abs(a.pay));
  
    let i = 0;
    let j = 0;

    // Liste des transactions à effectuer en une seule opération
    const transactionsToCreate = [];
  
    while (i < tabCreditor.length && j < tabDebtor.length) {
      let creditor = tabCreditor[i];
      let debtor = tabDebtor[j];
  
      let transactionAmount = Math.min(creditor.pay, Math.abs(debtor.pay));
  
      // Vérification supplémentaire pour s'assurer que le montant est correct
      if (transactionAmount > 0) {
        // Créer la transaction
        transactionsToCreate.push({
          amount: transactionAmount,
          senderType: debtor.type,
          receiverType: creditor.type,
          senderName: debtor.name,
          receiverName: creditor.name,
          eventId: eventId,
          senderId: debtor.id,
          receiverId: creditor.id,
        });

        // Mettre à jour les montants
        creditor.pay -= transactionAmount;
        debtor.pay += transactionAmount; // Le débiteur a un pay négatif, donc on ajoute pour revenir à 0

        console.log(`Debtor ${debtor.name} paie ${transactionAmount} à Creditor ${creditor.name}`);
      }

      // Passer au prochain créancier si son montant atteint 0
      if (creditor.pay === 0) {
        i++;
      }
      // Passer au prochain débiteur si son montant atteint 0
      if (debtor.pay === 0) {
        j++;
      }
    }

    // Insérer toutes les transactions en une seule fois
    if (transactionsToCreate.length > 0) {
      await Balancing.bulkCreate(transactionsToCreate, { transaction });
    }


    // Valider la transaction
    await transaction.commit();
  } catch (error) {
    // Annuler la transaction en cas d'erreur
    await transaction.rollback();
    console.error('Failed to generate transaction:', error);
  }  
};


exports.getListExpenses = async (req, res) => {
  const { eventId } = req.params;
  
  try {
    // Récupérer les dépenses associées à l'événement
    const expenses = await Expense.findAll({
      where: { eventId },
    });

    // Récupérer tous les users et guests en une seule requête
    const users = await User.findAll({
      include: [{
        model: Event,
        where: { id: eventId },
        attributes: ['userName'],
      }],
    });

    const guests = await Guest.findAll({
      include: [{
        model: Invitation,
        where: { eventId: eventId },
        attributes: ['guestName'],
      }],
    });

    // Créer un dictionnaire pour accéder rapidement aux payeurs par leur ID et type
    const payerMap = {};

    users.forEach(user => {
      payerMap[`user-${user.id}`] = user.Events[0].userName;
    });

    guests.forEach(guest => {
      payerMap[`guest-${guest.id}`] = guest.Invitation.guestName;
    });

    // Construire la liste détaillée des dépenses
    const detailedExpenses = expenses.map(expense => {
      const payerKey = `${expense.payerType}-${expense.payerId}`;
      const payerName = payerMap[payerKey] || null;

      return {
        id: expense.id,
        amount: expense.amount,
        description: expense.description,
        date: expense.date,
        payerName: payerName,
        payerType: expense.payerType,
      };
    });

    // Envoyer la réponse
    res.status(200).json({ expenses: detailedExpenses });
  } catch (error) {
    console.error('Failed to retrieve expenses:', error);
    res.status(500).json({ message: 'Failed to retrieve expenses' });
  }
};


exports.favoriteDate = async (req, res) => {
  const { eventId } = req.params;

  try {
    // Récupérer la/les date(s) avec le maximum de score
    const favoriteDates = await EventDate.findAll({
      where: {
        eventId: eventId,
        score: {
          [Op.gt]: 0, // Vérifie que le score est strictement supérieur à 0
        }
      },
      order: [[ 'score', 'DESC' ]], // Trie les résultats pour avoir les dates avec le plus de score en premier
      limit: 1, // On ne récupère que la date avec le maximum de score
    });

    // Vérifier s'il y a des résultats
    if (favoriteDates.length === 0) {
      return res.status(200).json({ message: 'Aucune date favorite pour le moment' });
    }

    // Récupérer la valeur du score maximum
    const maxScore = favoriteDates[0].score;

    // Obtenir toutes les dates qui ont le même nombre de score maximum (s'il y en a plusieurs)
    const eventDatesWithMaxScore = await EventDate.findAll({
      where: {
        eventId: eventId,
        score: maxScore,
      },
    });

    res.status(200).json({ eventDate: eventDatesWithMaxScore });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.getBalancing = async (req, res) => {
  const { eventId } = req.params;

  try {

    if (!eventId) {
      return res.status(400).json({ message: 'Missing eventId parameter' });
    }

    const listBalancing = await Balancing.findAll({
      where: {
        eventId: eventId
      },
    });

    for (const balancing of listBalancing) { 
      balancing.amount = Math.round(balancing.amount * 100) / 100;
    }

    res.status(200).json({ listBalancing });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPayParticipant = async (req, res) => {
  const { eventId } = req.params;

  try {

    if (!eventId) {
      return res.status(400).json({ message: 'Missing eventId parameter' });
    }
    
    const tabPayParticipant = await getTabPayParticipant(eventId);
    
    res.status(200).json({ tabPayParticipant });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getInfoExpense = async (req, res) => {
  const { eventId, expenseId } = req.params;

  try {

    if (!eventId || !expenseId) {
      return res.status(400).json({ message: 'Missing eventId or expenseId parameter' });
    }

    const expense = await Expense.findOne({
      where: { 
        eventId, 
        'id' : expenseId 
      },
      include: [
        {
          model: ExpenseParticipant,
        }
      ]
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    let payerName = null;

    if (expense.payerType === 'user') {
      const user = await User.findByPk(expense.payerId, {
        include: [
          {
            model: Event,
            where: { id: eventId },
            attributes: ['userName'],
          },
        ],
      });
      payerName = user ? user.Events[0].userName : null;
    } else if (expense.payerType === 'guest') {
      const guest = await Guest.findByPk(expense.payerId, {
        include: [
          {
            model: Invitation,
            where: { eventId: eventId },
            attributes: ['guestName'],
          },
        ],
      });        
      payerName = guest ? guest.Invitation.guestName : null;
    }
    expense.dataValues.payerName = payerName;

    for (const participant of expense.ExpenseParticipants) {
      let participantName = null;
      if (participant.participantType === 'user') {
        const user = await User.findByPk(participant.participantId, {
          include: [
            {
              model: Event,
              where: { id: eventId },
              attributes: ['userName'],
            },
          ],
        });
        participantName = user ? user.Events[0].userName : null;
      } else if (participant.participantType === 'guest') {
        const guest = await Guest.findByPk(participant.participantId, {
          include: [
            {
              model: Invitation,
              where: { eventId: eventId },
              attributes: ['guestName'],
            },
          ],
        });        
        participantName = guest ? guest.Invitation.guestName : null;
      }
      participant.dataValues.participantName = participantName;
    }
    
    res.status(200).json({ expense });
  } catch (error) {
    console.error('Failed to retrieve expense details:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteExpense = async (req, res) => {
  const { eventId, expenseId } = req.params;

  try {
    const expense = await Expense.findOne({
      where: { 
        id: expenseId, 
        eventId: eventId 
      }
    });
    
    if (expense) {
      await expense.destroy(); // Supprime l'entrée trouvée
      //fonction qui donne le tableau des participant et de leur solde
      const tabPayParticipant = await getTabPayParticipant(eventId);

      //fonction qui génère les transactions pour les remboursements
      await generateTransactions(tabPayParticipant, eventId);

      res.status(200).json({ message : 'Expense supprimée avec succès.' });
    } else {
      res.status(200).json({ message : 'Expense introuvable.' });
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.updateExpense = async (req, res) => {
  const { eventId, expenseId } = req.params;
  const { amount, description, date, participants } = req.body;

  try {
    const expense = await Expense.findOne({
      where: { id: expenseId, eventId: eventId },
      include: [ExpenseParticipant]
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense introuvable.' });
    }

    await expense.update({
      amount,
      description,
      date
    });

    if (participants && participants.length > 0) {
      const existingParticipants = await ExpenseParticipant.findAll({
        where: { expenseId: expenseId }
      });

      const existingParticipantIds = existingParticipants.map(p => p.id);

      // Supprimer les participants non inclus dans la nouvelle liste
      const participantIdsToRemove = existingParticipantIds.filter(id => !participants.some(p => p.id === id));
      await ExpenseParticipant.destroy({
        where: { id: participantIdsToRemove }
      });

      // Ajouter ou mettre à jour les participants
      for (const participant of participants) {
        if (participant.id) {
          // Mettre à jour un participant existant
          await ExpenseParticipant.update({
            shareValue: amount / participants.length
          }, {
            where: { id: participant.id }
          });
        } else {
          // Ajouter un nouveau participant
          await ExpenseParticipant.create({
            expenseId: expenseId,
            participantId: participant.participantId,
            participantType: participant.participantType,
            shareValue: amount / participants.length
          });
        }
      }
    }

    //fonction qui donne le tableau des participant et de leur solde
    const tabPayParticipant = await getTabPayParticipant(eventId);

    //fonction qui génère les transactions pour les remboursements
    await generateTransactions(tabPayParticipant, eventId);

    const updatedExpense = await Expense.findOne({
      where: { id: expenseId },
      include: [ExpenseParticipant]
    });

    return res.status(200).json({ message: 'Expense modifiée avec succès.', updatedExpense });

  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', error });
  }
};

exports.createPost = async (req, res) => {
  const { eventId, token } = req.params;
  const { topic } = req.body;

  // Validation de base des données reçues
  if (!eventId || !token || !topic || typeof topic !== 'string') {
    return res.status(400).json({ message: 'Missing required fields or invalid data' });
  }

  try {
    // Trouver l'événement
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Trouver le User ou Guest associé au token
    const userOrGuest = await User.findOne({ where: { token } }) ||
                        await Guest.findOne({ where: { token } });

    if (!userOrGuest) {
      return res.status(400).json({ message: 'Invalid token: payer not found' });
    }

    // Définir payerType et payerId selon l'entité trouvée
    const creatorType = userOrGuest instanceof User ? 'user' : 'guest';
    const creatorId = userOrGuest.id;

    // Créer la dépense
    const post = await Post.create({
      topic,
      creatorType,
      eventId,
      creatorId
    });

     // Diffuser le nouveau post via WebSocket
     if (global.wss) {
      global.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: 'NEW_POST',
              data: post,
            })
          );
        }
      });
    }

    res.status(200).json({ message: 'Post created successfully', post });
  } catch (error) {
    console.error('Failed to create post:', error);
    res.status(500).json({ message: 'Failed to create post' });
  }
};

exports.createDiscussion = async (req, res) => {
  const { eventId, token, postId } = req.params;
  const { messageText } = req.body;

  // Validation de base des données reçues  
  if (!eventId || !postId || !token || !messageText || typeof messageText !== 'string') {
    return res.status(400).json({ message: 'Missing required fields or invalid data' });
  }

  try {
    // Trouver l'événement
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Trouver le User ou Guest associé au token
    const userOrGuest = await User.findOne({ where: { token } }) ||
                        await Guest.findOne({ where: { token } });

    if (!userOrGuest) {
      return res.status(400).json({ message: 'Invalid token: payer not found' });
    }

    // Définir payerType et payerId selon l'entité trouvée
    const writorType = userOrGuest instanceof User ? 'user' : 'guest';
    const writorId = userOrGuest.id;

    // Créer la dépense
    const discussion = await Discussion.create({
      messageText,
      writorType,
      postId,
      eventId,
      writorId
    }); 

    const discussionCount = await Discussion.count({
      where: { postId } // Compte les messages liés à ce post
    });
    
     // Diffuser le nouveau post via WebSocket
     if (global.wss) {
      global.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: 'NEW_DISCUSSION',
              data: discussion,
              postId,
              discussionCount,
            })
          );
        }
      });
    }

    res.status(200).json({ message: 'Discussion created successfully', discussion });
  } catch (error) {
    console.error('Failed to create discussion:', error);
    res.status(500).json({ message: 'Failed to create discussion' });
  }
};

exports.getListPost = async (req, res) => {
  const { eventId } = req.params;

  if (!eventId) {
    return res.status(400).json({ message: 'Missing required parameter: eventId' });
  }

  try {
    // Récupérer les posts associés à l'événement
    const listPost = await Post.findAll({
      where: { eventId },
      attributes: {
        include: [
          [fn('COUNT', col('Discussions.id')), 'discussionCount'], // Ajout du compteur
        ],
      },
      include: [
        {
          model: Discussion,
          attributes: [], // Exclure les colonnes de Discussion dans les résultats (si non nécessaires)
        },
      ],
      group: ['Post.id'], // Nécessaire pour éviter les doublons et regrouper par Post
    });

    const detailedPosts = await Promise.all(listPost.map(async (post) => {
      let creatorName = null;

      if (post.creatorType === 'user') {
        const user = await User.findByPk(post.creatorId, {
          include: [
            {
              model: Event,
              where: { id: eventId },
              attributes: ['userName'],
            },
          ],
        });
        creatorName = user ? user.Events[0].userName : null;
      } else if (post.creatorType === 'guest') {
        const guest = await Guest.findByPk(post.creatorId, {
          include: [
            {
              model: Invitation,
              where: { eventId },
              attributes: ['guestName'],
            },
          ],
        });
        creatorName = guest ? guest.Invitation.guestName : null;
      }

      // Ajouter le nom du créateur au post
      return {
        ...post.dataValues,
        creatorName,
      };
    }));

    // Répondre avec la liste détaillée des posts
    res.status(200).json({ listPost: detailedPosts });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.getListDiscussion = async (req, res) => {
  const { eventId, postId } = req.params;

  if (!eventId || !postId) {
    return res.status(400).json({ message: 'Missing required parameters: eventId and postId' });
  }

  try {
    // Récupérer la liste des discussions pour le post
    const listDiscussion = await Discussion.findAll({
      where: { postId },
    });

    // Récupérer les noms des rédacteurs en parallèle
    const detailedDiscussions = await Promise.all(listDiscussion.map(async (discussion) => {
      let writorName = null;

      if (discussion.writorType === 'user') {
        const user = await User.findByPk(discussion.writorId, {
          include: [
            {
              model: Event,
              where: { id: eventId },
              attributes: ['userName'],
            },
          ],
        });
        writorName = user ? user.Events[0].userName : null;
      } else if (discussion.writorType === 'guest') {
        const guest = await Guest.findByPk(discussion.writorId, {
          include: [
            {
              model: Invitation,
              where: { eventId },
              attributes: ['guestName'],
            },
          ],
        });
        writorName = guest ? guest.Invitation.guestName : null;
      }

      // Ajouter le nom du rédacteur à la discussion
      return {
        ...discussion.dataValues,
        writorName,
      };
    }));

    // Récupérer le post et son créateur
    const post = await Post.findByPk(postId);
    let creatorName = null;

    if (post.creatorType === 'user') {
      const user = await User.findByPk(post.creatorId, {
        include: [
          {
            model: Event,
            where: { id: eventId },
            attributes: ['userName'],
          },
        ],
      });
      creatorName = user ? user.Events[0].userName : null;
    } else if (post.creatorType === 'guest') {
      const guest = await Guest.findByPk(post.creatorId, {
        include: [
          {
            model: Invitation,
            where: { eventId },
            attributes: ['guestName'],
          },
        ],
      });
      creatorName = guest ? guest.Invitation.guestName : null;
    }

    post.dataValues.creatorName = creatorName;

    // Répondre avec le post et la liste des discussions
    res.status(200).json({
      post,
      listDiscussion: detailedDiscussions,
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



