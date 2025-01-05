
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
      const { eventDateId, responseValue, order } = response;

      const existingResponse = await GuestResponse.findOne({
        where: {
          invitationId,
          eventDateId
        },
        transaction
      });

      if (existingResponse) {
        // Mise à jour de la réponse existante
        await existingResponse.update({ response: responseValue, order:  order }, { transaction });
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
          response: responseValue,
          order: order
        }, { transaction });
      }
    }

    // Mise à jour des scores pour chaque date de l'événement
    const eventDates = await EventDate.findAll({
      where: { eventId },
      transaction
    });

    for (const date of eventDates) {
      // Récupérer toutes les réponses pour cette date avec leur `response` et `order`
      const responses = await GuestResponse.findAll({
        where: { 
          eventDateId: date.id,
        },
        include: [{
          model: Invitation,
          where: { accepted: true }
        }],
        attributes: ['response', 'order'],
        transaction
      });
    
      // Calculer le score en cumulant les poids pour chaque réponse
      const totalDates = eventDates.length; // Nombre total de dates
      const score = responses.reduce((acc, res) => {
        const orderWeight = totalDates - res.order + 1; // Poids basé sur l'ordre        
        const responseValue = res.response ? 2 : 0; // 2 pour les réponses positives, 0 sinon
        return acc + responseValue + orderWeight; // Ajouter au score total
      }, 0);
    
      // Mettre à jour le score de la date
      await date.update({ score: parseInt(score) }, { transaction });
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
          attributes: ['response', 'order'],  // Inclure seulement la réponse
          include: [
            {
              model: EventDate, // Inclure les dates proposées
              attributes: ['proposed_date'],  // Récupérer la date proposée
            }
          ]
        }
      ],
      order: [
        [{ model: GuestResponse }, 'order', 'ASC'], // Ordre croissant par la colonne `order` de GuestResponse
      ],
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

