const assert = require('node:assert/strict');
const Module = require('node:module');
const test = require('node:test');

const originalLoad = Module._load;
Module._load = function loadWithLoggerStub(request, parent, isMain) {
    if (request === '../logger/logger' && parent?.filename.replaceAll('\\', '/').endsWith('/commandFunctions/evidence.js')) {
        return { info() {}, error() {} };
    }

    return originalLoad.call(this, request, parent, isMain);
};
const evidence = require('../reforger-server/commandFunctions/evidence');
Module._load = originalLoad;

function interaction() {
    return {
        deferred: false,
        replied: false,
        user: { id: '123456789012345678' },
        deferOptions: null,
        replyPayload: null,
        async deferReply(options) {
            this.deferred = true;
            this.deferOptions = options;
        },
        async editReply(payload) {
            this.replyPayload = payload;
        },
    };
}

const discordClient = {
    user: { displayAvatarURL: () => 'https://example.test/exd.png' },
};

test('returns a private HQ case creation link', async () => {
    const command = interaction();

    await evidence(command, {}, discordClient, {});

    assert.deepEqual(command.deferOptions, { ephemeral: true });
    const payload = command.replyPayload;
    assert.equal(payload.components[0].components[0].data.url, 'https://hq.exd.gg/support/manage/create');
    assert.equal(payload.components[0].components[0].data.label, 'Create HQ case');
    assert.doesNotMatch(payload.embeds[0].data.description, /paste/i);
});

test('opens an existing HQ case without exposing evidence in Discord', async () => {
    const command = interaction();

    await evidence(command, {}, discordClient, { case_number: 42 });

    const payload = command.replyPayload;
    assert.equal(payload.components[0].components[0].data.url, 'https://hq.exd.gg/support/manage/42');
    assert.equal(payload.components[0].components[0].data.label, 'Open case #42');
    assert.equal(payload.embeds.length, 1);
});
