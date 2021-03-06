/**
 * Created by Andrew Bell 10/26/18
 * www.recursivechaos.com
 * andrew@recursivechaos.com
 * Licensed under MIT License 2018. See LICENSE.txt for details.
 *
 * Assigns card to user when moved to a subscribed list.
 *
 * @param {Object} req Cloud Function request context.
 *                     More info: https://expressjs.com/en/api.html#req
 * @param {Object} res Cloud Function response context.
 *                     More info: https://expressjs.com/en/api.html#res
 */

/*
 * Trello Client Configuration
 */

let trello;
if (process.env.TRELLO_API_KEY && process.env.TRELLO_API_TOKEN) {
  const Trello = require("trello");
  trello = new Trello(process.env.TRELLO_API_KEY, process.env.TRELLO_API_TOKEN);
} else {
  res.status(500).send({error: 'Oops.'});
}

/*
 * API Wrappers (Catch exceptions so we can still return a 200 OK to the trello webhook)
 */

const addMemberToCard = (cardId, memberId) =>
  trello
    .addMemberToCard(cardId, memberId)
    .then(() => console.log(`Successfully added user '${memberId}' to card '${cardId}'`))
    .catch((res) => console.log(`Failed add user: '${memberId}' to card: '${cardId}' and res: ${JSON.stringify(res, null, 2)}`));

const deleteMemberFromCard = (cardId, memberId) =>
  trello
    .makeRequest('delete', `/1/cards/${cardId}/idMembers/${memberId}`)
    .then(() => console.log(`Successfully removed user '${memberId}' from card '${cardId}'`))
    .catch((res) => {
      console.log(`Failed delete user: '${memberId}' from card: '${cardId}' and res: ${JSON.stringify(res, null, 2)}`);
    });

/*
 * Action Method Handlers
 */

const handleCardMoved = (model, action) => {
  console.log("Handling moved card");
  if (model.id === action.data.card.idList) {
    console.log("Adding user to card moved to list.");
    addMemberToCard(action.data.card.id, action.idMemberCreator);
  } else {
    console.log("Removing user from card removed from list.");
    deleteMemberFromCard(action.data.card.id, action.idMemberCreator)
  }
};

const handleCardCopied = (model, action) => {
  console.log("Handling copied card");
  addMemberToCard(action.data.card.id, action.idMemberCreator);
};

const handleCardCreated = (model, action) => {
  console.log("Handling created card");
  addMemberToCard(action.data.card.id, action.idMemberCreator);
};

/*
 * Callback Logic
 */

const hasValidBody = (req) => req.body && req.body.action && req.body.action.display.translationKey && req.body.action.idMemberCreator && req.body.action.data.card && req.body.model.id;

exports.handleTrelloHook = (req, res) => {

  if (hasValidBody(req)) {
    console.log(`Processing '${req.method}' request with body '${JSON.stringify(req.body, null, 2)}'`);
    const action = req.body.action;
    const model = req.body.model;

    // Update by type of action
    switch (action.display.translationKey) {
      case "action_move_card_from_list_to_list":
        handleCardMoved(model, action);
        break;
      case "action_copy_card":
        handleCardCopied(model, action);
        break;
      case "action_create_card":
        handleCardCreated(model, action);
        break;
      default:
        console.log(`Didn't care about action: '${action.display.translationKey}' and card: card: ${JSON.stringify(action.data.card, null, 2)}`);
    }
    res.sendStatus(200);
  } else {
    res.status(400).send({error: 'Not a valid request.'});
  }
};