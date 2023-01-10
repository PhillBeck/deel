const { validateRoute } = require('./middleware/validateRoute')

const readContractValidator = validateRoute({
    params: {
        type: 'object',
        properties: {
            id: {
                type: 'integer',
            },
        },
        required: ['id'],
    }
})

const payJobValidator = validateRoute({
    params: {
        type: 'object',
        properties: {
            id: {
                type: 'integer',
            },
        },
        required: ['id'],
    }
})

const depositValidator = validateRoute({
    params: {
        type: 'object',
        properties: {
            userId: {
                type: 'integer',
            },
        },
        required: ['userId'],
    },
    body: {
        type: 'object',
        properties: {
            amount: {
                type: 'number',
                minimum: 0,
            },
        },
        required: ['amount'],
    }
})

const aggregatePaymentsByClientValidator = validateRoute({
    query: {
        type: 'object',
        properties: {
            start: {
                type: 'string',
                format: 'date',
            },
            end: {
                type: 'string',
                format: 'date',
            },
            limit: {
                type: 'integer',
                minimum: 1,
            },
        },
        required: ['start', 'end']
    }
})

const aggregatePaymentsByProfessionValidator = validateRoute({
    query: {
        type: 'object',
        properties: {
            start: {
                type: 'string',
                format: 'date',
            },
            end: {
                type: 'string',
                format: 'date',
            },
        },
        required: ['start', 'end']
    }
})


module.exports = {
    readContractValidator,
    payJobValidator,
    depositValidator,
    aggregatePaymentsByClientValidator,
    aggregatePaymentsByProfessionValidator
}