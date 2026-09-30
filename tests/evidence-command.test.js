const assert = require('node:assert/strict');
const Module = require('node:module');
const test = require('node:test');

const logger = { info() {}, verbose() {}, warn() {}, error() {} };
const originalLoad = Module._load;
Module._load = function loadWithLoggerStub(request, parent, isMain) {
    if (request === '../logger/logger' && parent?.filename.replaceAll('\\', '/').endsWith('/commandFunctions/evidence.js')) {
        return logger;
    }

    return originalLoad.call(this, request, parent, isMain);
};
const evidence = require('../reforger-server/commandFunctions/evidence');
const evidenceCommand = require('../reforger-server/commands/evidence');
Module._load = originalLoad;

function interaction() {
    return {
        deferred: false,
        replied: false,
        user: { id: '123456789012345678', username: 'Moderator' },
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

test('restores the original evidence slash command fields', () => {
    const command = evidenceCommand.data.toJSON();

    assert.equal(command.name, 'evidence');
    assert.deepEqual(command.options.map(option => option.name), ['identifier', 'reason', 'evidence']);
    assert.equal(command.options[0].required, true);
    assert.equal(command.options[1].required, true);
    assert.equal(command.options[2].required, false);
});

test('builds the original Discord evidence report with BattleMetrics fallback links', async t => {
    const command = interaction();
    let released = false;
    let receivedQuery;
    let receivedParams;
    const previousPool = process.mysqlPool;
    const previousBattleMetrics = process.battleMetrics;

    process.mysqlPool = {
        async getConnection() {
            return { release() { released = true; } };
        },
        async query(query, params) {
            receivedQuery = query;
            receivedParams = params;
            return [[{
                playerName: 'Reported Player',
                playerUID: '11111111-2222-3333-4444-555555555555',
                steamID: '76561198000000000',
                device: 'PC',
            }]];
        },
    };
    delete process.battleMetrics;
    t.after(() => {
        if (previousPool === undefined) delete process.mysqlPool;
        else process.mysqlPool = previousPool;
        if (previousBattleMetrics === undefined) delete process.battleMetrics;
        else process.battleMetrics = previousBattleMetrics;
    });

    await evidence(command, {
        config: {
            connectors: { mysql: { enabled: true } },
            commands: [{ command: 'evidence', destinationChannel: '<#123456789012345678>' }],
        },
    }, discordClient, {
        identifier: 'Reported Player',
        reason: 'Repeated team killing',
        evidence: 'https://example.test/private-clip',
    });

    assert.deepEqual(command.deferOptions, { ephemeral: true });
    assert.match(receivedQuery, /WHERE playerName LIKE \?/);
    assert.deepEqual(receivedParams, ['%Reported Player%']);
    assert.equal(released, true);
    const embed = command.replyPayload.embeds[0].data;
    assert.equal(embed.title, 'Evidence report');
    assert.match(embed.description, /<#123456789012345678>/);
    assert.match(embed.fields[0].value, /Reported Player/);
    assert.match(embed.fields[0].value, /Repeated team killing/);
    assert.match(embed.fields[0].value, /https:\/\/example\.test\/private-clip/);
    assert.match(embed.fields[0].value, /battlemetrics\.com\/rcon\/players/);
});
