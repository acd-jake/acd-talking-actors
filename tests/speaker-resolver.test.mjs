import test from 'node:test';
import assert from 'node:assert/strict';

import { SpeakerResolver } from '../scripts/speaker-resolver.js';

function makeActor(id, name) {
  return { id, _id: id, name, getFlag: () => null };
}

test('findSpeakerActorByChatData resolves the actor from the token when chatData lacks speaker.actor', () => {
  const actor = makeActor('actor-1', 'Barmaid');
  const token = {
    id: 'token-1',
    actor,
    document: { id: 'token-1', actor },
  };

  globalThis.canvas = {
    tokens: {
      get: (tokenId) => tokenId === 'token-1' ? token : null,
      placeables: [token],
    },
  };

  globalThis.game = {
    actors: [actor],
    modules: new Map(),
    settings: { get: () => null },
  };

  const resolvedActor = SpeakerResolver.findSpeakerActorByChatData({ speaker: { token: 'token-1' } });
  assert.equal(resolvedActor, actor);
});

test('findSpeakerActorByChatData ignores ambiguous name matches instead of picking the wrong actor', () => {
  const actorOne = makeActor('actor-1', 'Barmaid');
  const actorTwo = makeActor('actor-2', 'Barmaid');

  globalThis.canvas = {
    tokens: {
      get: () => null,
      placeables: [],
    },
  };

  globalThis.game = {
    actors: [actorOne, actorTwo],
    modules: new Map(),
    settings: { get: () => null },
  };

  assert.equal(SpeakerResolver.findUniqueActorByName('Barmaid'), null);
  assert.equal(SpeakerResolver.findSpeakerActorByChatData({ speaker: { alias: 'Barmaid' } }), null);
});
