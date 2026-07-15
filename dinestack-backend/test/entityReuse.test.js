const assert = require('node:assert/strict');
const test = require('node:test');
const crypto = require('node:crypto');

function makeDelegate(rows) {
    const matches = (row, where = {}) => Object.entries(where).every(([key, expected]) => {
        if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
            if ('notIn' in expected) return !expected.notIn.includes(row[key]);
            if ('in' in expected) return expected.in.includes(row[key]);
            if ('gte' in expected) return row[key] >= expected.gte;
        }
        return row[key] === expected;
    });

    return {
        rows,
        async create({ data }) {
            const row = {
                id: data.id || crypto.randomUUID(),
                createdAt: data.createdAt || new Date(),
                updatedAt: data.updatedAt || new Date(),
                ...data
            };
            rows.push(row);
            return row;
        },
        async findMany(args = {}) {
            return rows.filter((row) => matches(row, args.where));
        },
        async findFirst(args = {}) {
            return rows.find((row) => matches(row, args.where)) || null;
        },
        async findUnique({ where }) {
            return rows.find((row) => matches(row, where)) || null;
        },
        async update({ where, data }) {
            const row = rows.find((candidate) => matches(candidate, where));
            if (!row) throw new Error(`Record not found for ${JSON.stringify(where)}`);
            Object.entries(data).forEach(([key, value]) => {
                if (value && typeof value === 'object' && 'increment' in value) {
                    row[key] = (row[key] || 0) + value.increment;
                } else {
                    row[key] = value;
                }
            });
            row.updatedAt = new Date();
            return row;
        },
        async updateMany({ where, data }) {
            const targets = rows.filter((row) => matches(row, where));
            targets.forEach((row) => Object.assign(row, data));
            return { count: targets.length };
        },
        async deleteMany(args = {}) {
            const before = rows.length;
            for (let i = rows.length - 1; i >= 0; i -= 1) {
                if (matches(rows[i], args.where)) rows.splice(i, 1);
            }
            return { count: before - rows.length };
        },
        async count(args = {}) {
            return rows.filter((row) => matches(row, args.where)).length;
        }
    };
}

function makePrismaMock() {
    const store = {
        restaurants: [],
        activationCodes: [],
        devices: [],
        sessions: [],
        refreshTokens: [],
        recoveryCodes: [],
        apiKeys: [],
        pairCodes: [],
        tables: [],
        tableSessions: [],
        customers: [],
        categories: [],
        menuItems: [],
        orders: [],
        orderItems: [],
        subscriptions: [],
        payments: [],
        auditLogs: []
    };

    const prisma = {
        store,
        restaurant: makeDelegate(store.restaurants),
        activationCode: makeDelegate(store.activationCodes),
        device: makeDelegate(store.devices),
        session: makeDelegate(store.sessions),
        refreshToken: makeDelegate(store.refreshTokens),
        recoveryCode: makeDelegate(store.recoveryCodes),
        apiKey: makeDelegate(store.apiKeys),
        pairCode: makeDelegate(store.pairCodes),
        table: makeDelegate(store.tables),
        tableSession: makeDelegate(store.tableSessions),
        customer: makeDelegate(store.customers),
        category: makeDelegate(store.categories),
        menuItem: makeDelegate(store.menuItems),
        order: makeDelegate(store.orders),
        orderItem: makeDelegate(store.orderItems),
        subscription: makeDelegate(store.subscriptions),
        payment: makeDelegate(store.payments),
        auditLog: makeDelegate(store.auditLogs),
        async $transaction(callback) {
            return callback(prisma);
        }
    };

    return prisma;
}

function makeResponse() {
    return {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        }
    };
}

async function call(handler, req) {
    const res = makeResponse();
    await handler(req, res);
    return res;
}

test('deleted restaurant names can be reused without leaking old identity or runtime traces', async () => {
    const prisma = makePrismaMock();
    const prismaPath = require.resolve('../src/prisma');
    require.cache[prismaPath] = {
        id: prismaPath,
        filename: prismaPath,
        loaded: true,
        exports: prisma
    };

    const { createRestaurant, deleteRestaurant } = require('../src/dashboard/dashboard.controller');
    const { createActivationCode, activateDevice } = require('../src/activation/activation.controller');

    const user = { email: 'owner@example.com' };
    const restaurantName = "Anwar's Cafe";

    const firstCreate = await call(createRestaurant, { body: { name: restaurantName }, user });
    assert.equal(firstCreate.statusCode, 201);
    assert.equal(firstCreate.body.name, restaurantName);
    const firstId = firstCreate.body.id;

    const firstKey = await call(createActivationCode, { body: { restaurantName }, user });
    assert.equal(firstKey.statusCode, 201);
    const firstActivation = await call(activateDevice, { body: { activationCode: firstKey.body.code } });
    assert.equal(firstActivation.body.restaurant.id, firstId);

    await prisma.session.create({ data: { restaurantId: firstId, token: 'old-jwt', tableId: 'table-1', expiresAt: new Date() } });
    await prisma.refreshToken.create({ data: { restaurantId: firstId, tokenHash: 'old-refresh', expiresAt: new Date() } });
    await prisma.recoveryCode.create({ data: { restaurantId: firstId, codeHash: 'old-recovery' } });
    await prisma.apiKey.create({ data: { restaurantId: firstId, key: 'old-backup-reference' } });
    await prisma.pairCode.create({ data: { restaurantId: firstId, code: 'old-sync-history', expiresAt: new Date() } });
    await prisma.device.create({ data: { restaurantId: firstId, deviceId: 'old-device', status: 'Online' } });

    const deletion = await call(deleteRestaurant, { params: { id: firstId }, user });
    assert.equal(deletion.statusCode, 200);
    assert.equal(deletion.body.restaurant.name, restaurantName);
    assert.equal(deletion.body.restaurant.status, 'DELETED');
    assert.equal(deletion.body.restaurant.archivedDisplayName, restaurantName);
    assert.match(deletion.body.restaurant.deletionMarker, /^DELETED-/);

    const secondCreate = await call(createRestaurant, { body: { name: restaurantName }, user });
    assert.equal(secondCreate.statusCode, 201);
    assert.equal(secondCreate.body.name, restaurantName);
    assert.notEqual(secondCreate.body.id, firstId);
    const secondId = secondCreate.body.id;

    const secondKey = await call(createActivationCode, { body: { restaurantName }, user });
    assert.equal(secondKey.statusCode, 201);
    assert.notEqual(secondKey.body.id, firstKey.body.id);
    const secondActivation = await call(activateDevice, { body: { activationCode: secondKey.body.code } });
    assert.equal(secondActivation.body.restaurant.id, secondId);
    assert.equal(secondActivation.body.restaurant.name, restaurantName);

    assert.equal(prisma.store.sessions.some((row) => row.restaurantId === firstId), false);
    assert.equal(prisma.store.refreshTokens.some((row) => row.restaurantId === firstId), false);
    assert.equal(prisma.store.recoveryCodes.some((row) => row.restaurantId === firstId), false);
    assert.equal(prisma.store.apiKeys.some((row) => row.restaurantId === firstId), false);
    assert.equal(prisma.store.pairCodes.some((row) => row.restaurantId === firstId), false);
    assert.equal(prisma.store.devices.some((row) => row.restaurantId === firstId), false);
    assert.equal(prisma.store.devices.some((row) => row.restaurantId === secondId && row.deviceId === 'old-device'), false);
    assert.equal(prisma.store.activationCodes.some((row) => row.restaurantId === firstId), false);
    assert.equal(prisma.store.auditLogs.some((row) => row.target === `Restaurant:${firstId}`), true);

    const oldEntity = prisma.store.restaurants.find((row) => row.id === firstId);
    assert.equal(oldEntity.status, 'DELETED');
    assert.equal(oldEntity.name, restaurantName);
    assert.equal(oldEntity.activationCodeId, null);
});
