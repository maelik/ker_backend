
const { Guest, Invitation, GuestResponse, EventDate } = require('../models'); // Assurez-vous d'importer les bons modèles
const { sequelize } = require('../models');

exports.respondToInvitation = async (req, res) => {
  const transaction = await sequelize.transaction(); // Démarrer une transaction
  try {
    const { token, eventId } = req.params;
    const { responses, accepted, guestName } = req.body;

    // Vérification de l'existence de l'invité
    const guest = await Guest.findOne({ where: { token } });
    if (!guest) return res.status(404).json({ error: 'Guest not found' });

    // Vérification de l'invitation liée à cet invité et cet événement
    const invitation = await Invitation.findOne({
      where: { 
        eventId,
        guestId: guest.id 
      },
      transaction
    });
    if (!invitation) return res.status(404).json({ error: 'Invitation not found' });

    // Mise à jour des informations de l'invitation
    invitation.guestName = guestName;
    invitation.accepted = accepted;
    await invitation.save({ transaction });
    
    const invitationId = invitation.id;

    // Traitement des réponses pour chaque date
    for (const response of responses) {
      const { eventDateId, responseValue } = response;

      const existingResponse = await GuestResponse.findOne({
        where: {
          invitationId,
          eventDateId
        },
        transaction
      });

      if (existingResponse) {
        // Mise à jour de la réponse existante
        await existingResponse.update({ response: responseValue }, { transaction });
      } else {
        // Vérification de l'existence de la date d'événement
        const eventDate = await EventDate.findOne({
          where: {
            id: eventDateId,
            eventId
          },
          transaction
        });
        if (!eventDate) {
          return res.status(404).json({ message: `Event date with ID ${eventDateId} not found for this event` });
        }
        // Création d'une nouvelle réponse
        await GuestResponse.create({
          invitationId,
          eventDateId,
          response: responseValue
        }, { transaction });
      }
    }

    // Mise à jour des votes pour chaque date de l'événement
    const eventDates = await EventDate.findAll({
      where: { eventId },
      transaction
    });

    for (const date of eventDates) {
      const positiveResponses = await GuestResponse.count({
        where: {
          eventDateId: date.id,
          response: true
        },
        transaction
      });

      await date.update({ vote: positiveResponses }, { transaction });
    }

    // Valider la transaction après toutes les opérations
    await transaction.commit();

    res.status(200).json(invitation);
  } catch (error) {
    // Rollback en cas d'erreur
    await transaction.rollback();
    console.error('Error during invitation response:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getResponses = async (req, res) => {
  try {
    const { token, eventId } = req.params;

    // Vérification de l'existence de l'invité
    const guest = await Guest.findOne({ where: { token } });
    if (!guest) return res.status(404).json({ error: 'Guest not found' });

    // Vérification de l'invitation liée à cet invité et cet événement
    const invitation = await Invitation.findOne({
      where: { 
        eventId,
        guestId: guest.id
      },
      attributes: ['guestName', 'accepted'],  // Sélectionner seulement les champs nécessaires
      include: [
        {
          model: GuestResponse, // Inclure les réponses des invités
          attributes: ['response'],  // Inclure seulement la réponse
          include: [
            {
              model: EventDate, // Inclure les dates proposées
              attributes: ['proposed_date'],  // Récupérer la date proposée
            }
          ]
        }
      ]
    });

    // Vérifier l'existence de l'invitation
    if (!invitation) return res.status(404).json({ error: 'Invitation not found' });

    // Transformer les dates dans les réponses
    const transformedInvitation = invitation.toJSON(); // Convertir Sequelize à un objet simple
    transformedInvitation.GuestResponses.forEach((response) => {
      if (response.EventDate && response.EventDate.proposed_date) {
        response.EventDate.proposed_date = new Intl.DateTimeFormat('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }).format(new Date(response.EventDate.proposed_date));
      }
    });    

    // Retourner les détails de l'invitation avec les réponses et les dates
    res.status(200).json(transformedInvitation);

  } catch (error) {
    // En cas d'erreur, loguer l'erreur et retourner un message d'erreur serveur
    console.error('Error fetching responses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

