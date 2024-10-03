// /controllers/invitationController.js
const { Invitation, Guest, EventDate, GuestResponse } = require('../models');


exports.respondToInvitation = async (req, res) => {
  try {
    const { token,  eventId } = req.params;
    const { responses, accepted, guestName } = req.body;

    const guest = await Guest.findOne({ where: { token } });
    if (!guest) return res.status(404).json({ error: 'Guest not found' });

    const invitation = await Invitation.findOne({
        where: 
        { 
          eventId: eventId,
          guestId : guest.id,
        } 
      });
    if (!invitation) return res.status(404).json({ error: 'Invitation not found' });

    invitation.guestName = guestName;
    invitation.accepted = accepted;

    await invitation.save();
    const invitationId = invitation.id;
    
    for (const response of responses) {
      const { eventDateId, responseValue } = response;  // responseValue est un booléen (accepté ou refusé)
      const existingResponse = await GuestResponse.findOne({
        where: {
          invitationId: invitationId,
          eventDateId: eventDateId
        }
      });
      if (existingResponse) {
        // Mise à jour de la réponse existante
        await existingResponse.update({
          response: responseValue
        });
      } else {        
        // Vérifier si la date existe
        const eventDate = await EventDate.findOne({
          where: {
            id: eventDateId,
            eventId: eventId  // S'assurer que la date appartient à cet événement
          }
        });
        if (!eventDate) {
          return res.status(404).json({ message: `Event date with ID ${eventDateId} not found for this event` });
        }
        // Création d'une nouvelle réponse
        await GuestResponse.create({
          invitationId: invitationId,
          eventDateId: eventDateId,
          response: responseValue
        });
      }    
    }
    const eventDates = await EventDate.findAll({
      where: {
        eventId: eventId
      }
    });

    for (const date of eventDates) {
      const response = await GuestResponse.findAll({
        where: {
          eventDateId: date.id,
          response: true  // S'assurer que la date appartient à cet événement
        }
      });
      await date.update({
        vote: response.length,
      });
    }


    res.status(200).json(invitation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getResponses = async (req, res) => {
  try {
    const { token,  eventId } = req.params;
    const guest = await Guest.findOne({ where: { token } });
    if (!guest) return res.status(404).json({ error: 'Guest not found' });

    //const guestId = guest.id;

    const invitation = await Invitation.findOne({
        where: 
        { 
          eventId: eventId,
          guestId : guest.id,
        },
        attributes: ['guestName','accepted'],        
        include: [
          {
            model: GuestResponse, // Récupérer les réponses des invités
            attributes: ['response'], // Récupérer la réponse (boolean)
            include: [
              {
                model: EventDate, // Inclure les dates proposées
                attributes: ['proposed_date'],
              },
            ],
          },
        ],
      });
    if (!invitation){
      return res.status(404).json({ error: 'Invitation not found' });
    }
    res.status(201).json(invitation);
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
  }
}
