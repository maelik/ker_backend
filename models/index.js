const sequelize = require('../config/database');
const User = require('./User');
const Event = require('./Event');
const Guest = require('./Guest');
const Invitation = require('./Invitation');
const EventDate =  require('./EventDate');
const GuestResponse =  require('./GuestResponse');
const Expense =  require('./Expense');
const ExpenseParticipant =  require('./ExpenseParticipant');
const Balancing =  require('./Balancing');
const Post =  require('./Post');
const Discussion =  require('./Discussion');

// Relations
User.hasMany(Event, { foreignKey: 'userId' });
Event.belongsTo(User, { foreignKey: 'userId' });

Event.hasMany(Invitation, { foreignKey: 'eventId' });
Invitation.belongsTo(Event, { foreignKey: 'eventId' });

Guest.hasOne(Invitation, { foreignKey: 'guestId' });
Invitation.belongsTo(Guest, { foreignKey: 'guestId' });

Event.hasMany(EventDate, { foreignKey: 'eventId' });
EventDate.belongsTo(Event, { foreignKey: 'eventId' });

Invitation.hasMany(GuestResponse, { foreignKey: 'invitationId' });
GuestResponse.belongsTo(Invitation, { foreignKey: 'invitationId' });

EventDate.hasMany(GuestResponse, { foreignKey: 'eventDateId' });
GuestResponse.belongsTo(EventDate, { foreignKey: 'eventDateId' });

Expense.hasMany(ExpenseParticipant, { foreignKey: 'expenseId', onDelete: 'CASCADE' });
ExpenseParticipant.belongsTo(Expense, { foreignKey: 'expenseId' });

Event.hasMany(Expense, { foreignKey: 'eventId' });
Expense.belongsTo(Event, { foreignKey: 'eventId' });

Expense.belongsTo(User, {
  foreignKey: 'payerId',
  constraints: false,
  as: 'payerUser',
  scope: {
    payerType: 'user',
  },
});

Expense.belongsTo(Guest, {
  foreignKey: 'payerId',
  constraints: false,
  as: 'payerGuest',
  scope: {
    payerType: 'guest',
  },
});

ExpenseParticipant.belongsTo(User, {
  foreignKey: 'participantId',
  constraints: false,
  as: 'participantUser',
  scope: {
    participantType: 'user',
  },
});

ExpenseParticipant.belongsTo(Guest, {
  foreignKey: 'participantId',
  constraints: false,
  as: 'participantGuest',
  scope: {
    participantType: 'guest',
  },
});

Event.hasMany(Balancing, { foreignKey: 'eventId' });
Balancing.belongsTo(Event, { foreignKey: 'eventId' });

Balancing.belongsTo(User, {
  foreignKey: 'senderId',
  constraints: false,
  as: 'senderUser',
  scope: {
    senderType: 'user',
  },
});

Balancing.belongsTo(Guest, {
  foreignKey: 'senderId',
  constraints: false,
  as: 'senderGuest',
  scope: {
    senderType: 'guest',
  },
});

Balancing.belongsTo(User, {
  foreignKey: 'receiverId',
  constraints: false,
  as: 'receiverUser',
  scope: {
    receiverType: 'user',
  },
});

Balancing.belongsTo(Guest, {
  foreignKey: 'receiverId',
  constraints: false,
  as: 'receiverGuest',
  scope: {
    receiverType: 'guest',
  },
});

Post.hasMany(Discussion, { foreignKey: 'postId' });
Discussion.belongsTo(Post, { foreignKey: 'postId' });

Event.hasMany(Post, { foreignKey: 'eventId' });
Post.belongsTo(Event, { foreignKey: 'eventId' });

Post.belongsTo(User, {
  foreignKey: 'creatorId',
  constraints: false,
  as: 'creatorUser',
  scope: {
    creatorType: 'user',
  },
});

Post.belongsTo(Guest, {
  foreignKey: 'creatorId',
  constraints: false,
  as: 'creatorGuest',
  scope: {
    creatorType: 'guest',
  },
});


Discussion.belongsTo(User, {
  foreignKey: 'writorId',
  constraints: false,
  as: 'writorUser',
  scope: {
    writorType: 'user',
  },
});

Discussion.belongsTo(Guest, {
  foreignKey: 'writorId',
  constraints: false,
  as: 'writorGuest',
  scope: {
    writorType: 'guest',
  },
});

module.exports = {
  sequelize,
  User,
  Event,
  Guest,
  Invitation,
  EventDate,
  GuestResponse,
  Expense,
  ExpenseParticipant,
  Balancing,
  Post,
  Discussion
};