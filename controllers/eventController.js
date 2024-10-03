const { Event, EventDate, User, Guest, Invitation, GuestResponse, Expense, ExpenseParticipant, Balancing, Post, Discussion } = require('../models');
const crypto = require('crypto');
const { sequelize } = require('../models');
const { fn, col, Transaction } = require('sequelize');
const { log } = require('console');

exports.createEvent = async (req, res) => {
  try {
    const { title, description, userName, location, userId, dates } = req.body;
    console.log(userName);
    
    // Création de l'événement
    const event = await Event.create({
      title,
      description,
      userName,
      location,
      userId
    });

    const eventId = event.id;
    
    // Création des dates proposées
    const eventDates = dates.map(date => ({
      eventId: eventId,
      proposed_date: date.proposed_date
    }));

    await EventDate.bulkCreate(eventDates);
    
    const inviteLink = `/events/${eventId}/invite`;
    res.status(201).json({ 
      'eventId': eventId, 
      'inviteLink': inviteLink
    });
  } catch (error) {
    console.error('Error creating event with dates:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.connexionLinkInvitation = async (req, res) => {
  const { email } = req.body;
  const { eventId } = req.params;
  
  try {
    // Trouver l'événement associé
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Vérification si l'invité existe déjà
    let guest = await Guest.findOne({ where: { email } });

    if (!guest) {
        // Création d'un nouvel invité avec un ID unique
        const token = crypto.randomBytes(16).toString('hex');
        guest = await Guest.create({ email, eventId, token });
    }

    // Vérification si l'invitation existe déjà
    let invitation = await Invitation.findOne({ 
      where: { 
        guestId : guest.id,
        eventId: eventId
      }
    });

    if (!invitation) {
      // Créer une invitation pour cet invité
      invitation = await Invitation.create({
        eventId: eventId,
        guestId: guest.id,
      });
  }

    res.status(201).json({
      'guest' : guest,
      'invitation' : invitation
    });

  } catch (error) {
    console.error('Error handling invitation:', error);
    res.status(500).json({ message: 'Failed to handle invitation' });
  }
};

exports.getListEvents = async (req, res) => {
    try {
      const { email } = req.params;

      const creator = await User.findOne({ where: { email } });
      let userToken = '';
      let eventsCreated = [];
      if (creator) {
        const creatorId = creator.id;
        userToken =  creator.token;
        eventsCreated = await Event.findAll({ 
          where: { 
            userId : creatorId,
          } ,
          attributes: ['id', 'title'],
        });
      }

      const guest = await Guest.findOne({ where: { email } });
      let guestToken = '';
      let eventsInvited = [];
      if (guest) {
        const guestId = guest.id;
        guestToken = guest.token;
        const tabInvitations = await Invitation.findAll(
          {
            where :{
              guestId : guestId
            },
            include: [
              {
                model: Event,
                attributes: ['id', 'title'],
              },
            ]
          }
        );
        eventsInvited = tabInvitations.map(invitation => invitation.Event);
      }

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
  try {
    const { eventId, token } = req.params;
    const event = await Event.findOne({
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
    
    // Si le token est présent, vérifier s'il correspond à celui du créateur    
    if (token && token === event.User.token) {
      return res.status(200).json({ event, view: 'user' });
    } else {
      return res.status(200).json({ event, view: 'guest' });
    }
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
  }
}

exports.getEventParticipantsAndResponses = async (req, res)  => {
  try {
    const { eventId }= req.params;
    const canCome = [];
    const cannotCome = [];
    const event = await Event.findByPk(eventId, {
      include: [
        {
          model: Invitation,
          attributes: ['guestName', 'accepted'], // Récupérer le nom du guest
          include: [
            {
              model: GuestResponse, // Récupérer les réponses des invités
              include: [
                {
                  model: EventDate, // Inclure les dates proposées
                  attributes: ['proposed_date'],
                },
              ],
              attributes: ['response'], // Récupérer la réponse (boolean)
            },
          ],
        },
      ],
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    for (const participant of event.Invitations) {
      if (participant.accepted == true) {
        canCome.push(participant);
      } else if (participant.accepted == false) {
        cannotCome.push(participant);
      }
      
    }

    res.status(201).json({
      'canCome': canCome,
      'cannotCome': cannotCome,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getListParticipants = async (req, res)  => {
  try {
    const { eventId }= req.params;
    const listParticipants = [];
    const event = await Event.findByPk(eventId, {
      include: [
        {
          model: Invitation,
          where : {
            accepted : true,
          },
          attributes: ['guestName', 'guestId'],
        },
        {
          model: User,
          attributes: ['id'],
        }
      ],
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    listParticipants.push({
        'name' : event.userName,
        'id' : event.userId,
        'type' : 'user',
      });
   
    for (const participant of event.Invitations) {
      listParticipants.push({
        'name' : participant.guestName,
        'id' : participant.guestId,
        'type' : 'guest',
      });
    }

    res.status(201).json({
      'listParticipants': listParticipants,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.updateEvent = async (req, res) => {
  const { eventId } = req.params;
  const { title, userName, description, location, eventDates } = req.body;

  try {
    // Trouver l'événement à mettre à jour
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Mettre à jour l'événement avec les nouvelles données
    event.title = title;
    event.description = description;
    event.userName = userName;
    event.location = location;

    // Sauvegarder les modifications
    await event.save();

    //foreach le tableau des dates
    //regarder si elle existe
    //si non ajouter la date

    for (let date of eventDates) {
      const existingDate = await EventDate.findOne({
        where: { eventId: eventId, proposed_date: date.proposed_date }
      });
      if (!existingDate) {
        await EventDate.create({ eventId: eventId, proposed_date: date.proposed_date, vote: date.vote });
      }
    }

    res.status(200).json({ message: 'Event updated successfully', event });
  } catch (error) {
    console.error('Failed to update event:', error);
    res.status(500).json({ message: 'Failed to update event' });
  }
};

exports.createExpense = async (req, res) => {
  const { eventId, token } = req.params;
  const { amount, description, date, distribution, participants } = req.body;
  

  // Validation de base des données reçues
  if (!amount || !description || !date || !participants || !Array.isArray(participants)) {
    return res.status(400).json({ message: 'Missing required fields or invalid data' });
  }

  // Commencer une transaction
  const transaction = await sequelize.transaction();

  try {
    // Trouver l'événement
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Trouver le User ou Guest associé au token
    const userOrGuest = await User.findOne({ where: { token }, transaction }) ||
                        await Guest.findOne({ where: { token }, transaction });

    if (!userOrGuest) {
      return res.status(400).json({ message: 'Invalid token: payer not found' });
    }

    // Définir payerType et payerId selon l'entité trouvée
    const payerType = userOrGuest instanceof User ? 'user' : 'guest';
    const payerId = userOrGuest.id;

    console.log(userOrGuest);
    console.log(payerType);
    console.log(payerId);
    

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

    // Associer les participants à la dépense
    for (const participant of participants) {
      await ExpenseParticipant.create({
        expenseId: expense.id,
        participantId: participant.id,
        participantType: participant.type,
        shareValue : amount / participants.length
      }, { transaction });
    }

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
        include: [
          {
            model: Guest,
            attributes: ['id'],
          },
        ],
      },
    ],
  });

  const listParticipants = [
    {
      type: 'user',
      id: event.User.id,
      name: event.userName,
    },
  ];

  for (const invitation of event.Invitations) {
    const guest = {
      type: 'guest',
      id: invitation.Guest.id,
      name: invitation.guestName,
    };
    listParticipants.push(guest);
  }

  // 2 - Pour chaque participant, récupérer ses dépenses (en tant que payeur ou participant)
  for (const participant of listParticipants) {
    let totalExpenses = 0;

    // Récupérer les dépenses où le participant est le payeur
    const expensesAsPayer = await Expense.findAll({
      where: {
        payerId: participant.id,
        payerType: participant.type,
        eventId: eventId,
      },
    });
    
    // Ajouter le montant total des dépenses qu'il a payées
    for (const expense of expensesAsPayer) {
      totalExpenses += expense.amount;
    }

    // Récupérer les dépenses où le participant est inclus
    const expensesAsParticipant = await ExpenseParticipant.findAll({
      where: {
        participantId: participant.id,
        participantType: participant.type,
      },
      include: [
        {
          model: Expense,
          where: { eventId: eventId },
        },
      ],
    });
    
    // Ajouter la part qu'il doit payer dans chaque dépense
    for (const participantExpense of expensesAsParticipant) {
      totalExpenses -= participantExpense.shareValue; // La part du participant est soustraite
    }
    
    // 3 - Ajouter le solde du participant dans le tableau
    participant.pay = totalExpenses;
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
      }
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
  
    while (i < tabCreditor.length && j < tabDebtor.length) {
      let creditor = tabCreditor[i];
      let debtor = tabDebtor[j];
  
      let transactionAmount = Math.min(creditor.pay, Math.abs(debtor.pay));
  
      // Effectuer la transaction
      await Balancing.create({
        'amount' : transactionAmount,
        'senderType' : debtor.type,
        'receiverType' : creditor.type,
        'senderName' : debtor.name,
        'receiverName' : creditor.name,
        eventId,
        'senderId' : debtor.id,
        'receiverId' : creditor.id,
      }, { transaction });
      
      console.log(`Debtor ${debtor.name} paie ${transactionAmount} à Creditor ${creditor.name}`);
  
      // Mettre à jour les valeurs de pay
      creditor.pay -= transactionAmount;
      debtor.pay += transactionAmount; // On ajoute car debtor.pay est négatif
  
      // Passer au prochain creditor ou debtor si leur pay atteint 0
      if (creditor.pay === 0) {
        i++;
      }
      if (debtor.pay === 0) {
        j++;
      }
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

    const detailedExpenses = await Promise.all(expenses.map(async (expense) => {
      let payerName = null;

      // Vérifier le type de payeur et récupérer les informations correspondantes
      if (expense.payerType === 'user') {
        const user = await User.findByPk(expense.payerId, {
          include: [
            {
              model: Event,
              where: { id: eventId },
              attributes: ['userName'],
            }
          ]
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

      return {
        id: expense.id,
        amount: expense.amount,
        description: expense.description,
        date: expense.date,
        payerName: payerName,
        payerType: expense.payerType,
      };
    }));

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
    const maxVote = await EventDate.findOne({
      where: {
        eventId: eventId
      },
      attributes:[[fn('MAX', col('vote')), 'maxVote']]
    });
    
    const eventDate = await EventDate.findAll({
      where: {
        eventId: eventId,
        vote: maxVote.get('maxVote')
      },
    });
    
    res.status(200).json({ eventDate });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBalancing = async (req, res) => {
  const { eventId } = req.params;

  try {
    const balancing = await Balancing.findAll({
      where: {
        eventId: eventId
      },
    });
    
    res.status(200).json({ balancing });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPayParticipant = async (req, res) => {
  const { eventId } = req.params;

  try {
    const tabPayParticipant = await getTabPayParticipant(eventId);
    
    res.status(200).json({ tabPayParticipant });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getInfoExpense = async (req, res) => {
  const { eventId, expenseId } = req.params;
  let payerName = null;

  try {
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
    console.error('Server error:', error);
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
  if (!topic) {
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
  if (!messageText) {
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

    res.status(200).json({ message: 'Discussion created successfully', discussion });
  } catch (error) {
    console.error('Failed to create discussion:', error);
    res.status(500).json({ message: 'Failed to create discussion' });
  }
};

exports.getListPost = async (req, res) => {
  const { eventId } = req.params;

  try {
    const listPost = await Post.findAll({
      where: { 
        eventId 
      },
    });

    

    for (const post of listPost) {
      
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
              where: { eventId: eventId },
              attributes: ['guestName'],
            },
          ],
        });     
        creatorName = guest ? guest.Invitation.guestName : null;
      }
      post.dataValues.creatorName = creatorName;
    }
    
    res.status(200).json({ listPost });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getListDiscussion = async (req, res) => {
  const { eventId, postId } = req.params;

  try {
    const listDiscussion = await Discussion.findAll({
      where: {
        postId 
      }
    });    

    for (const discussion of listDiscussion) {
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
              where: { eventId: eventId },
              attributes: ['guestName'],
            },
          ],
        });        
        writorName = guest ? guest.Invitation.guestName : null;
      }
      discussion.dataValues.writorName = writorName;
    }

    const post = await Post.findByPk(postId);
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
            where: { eventId: eventId },
            attributes: ['guestName'],
          },
        ],
      });     
      creatorName = guest ? guest.Invitation.guestName : null;
    }
    post.dataValues.creatorName = creatorName;

    
    res.status(200).json({
      'post' : post,
      'listDiscussion' : listDiscussion, 
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



