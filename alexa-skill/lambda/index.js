// "Claude" Alexa skill (Alexa-hosted). It does no work itself: it just keeps Alexa quiet.
// The home Mac reads Alexa voice history, sees anything said to this skill, and has Claude handle it.
const Alexa = require('ask-sdk-core');

const say = (h, text, keepOpen) => {
  const r = h.responseBuilder.speak(text);
  if (keepOpen) r.reprompt('Go ahead.'); else r.withShouldEndSession(true);
  return r.getResponse();
};

const Launch = {
  canHandle: h => Alexa.getRequestType(h.requestEnvelope) === 'LaunchRequest',
  handle: h => say(h, 'Claude here. What do you need?', true),
};
const Command = {
  canHandle: h => Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest' &&
    ['CatchAllIntent', 'AMAZON.FallbackIntent', 'AMAZON.HelpIntent', 'AMAZON.NavigateHomeIntent']
      .includes(Alexa.getIntentName(h.requestEnvelope)),
  handle: h => say(h, '<audio src="soundbank://soundlibrary/computers/beeps_tones/beeps_tones_08"/> On it.', false),
};
const Stop = {
  canHandle: h => Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest' &&
    ['AMAZON.StopIntent', 'AMAZON.CancelIntent'].includes(Alexa.getIntentName(h.requestEnvelope)),
  handle: h => h.responseBuilder.withShouldEndSession(true).getResponse(),
};
const End = {
  canHandle: h => Alexa.getRequestType(h.requestEnvelope) === 'SessionEndedRequest',
  handle: h => h.responseBuilder.getResponse(),
};
const Err = { canHandle: () => true, handle: (h) => say(h, 'On it.', false) };

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(Launch, Command, Stop, End)
  .addErrorHandlers(Err)
  .lambda();
