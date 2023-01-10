const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./model')
const { getProfile } = require('./middleware/getProfile')
const app = express();
const { JobService } = require('./service')
const endpoints = require('./endpoints')
const validators = require('./validators')
const { ValidationError } = require('./exceptions')
const logger = require('./logger')
const morganMiddleware = require('./middleware/morgan')


app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)
app.set('services', { jobService: new JobService(sequelize) })
app.use(morganMiddleware)


app.get('/contracts/:id', getProfile, validators.readContractValidator, endpoints.readContract)
app.get('/contracts', getProfile, endpoints.listContracts)

app.get('/jobs/unpaid', getProfile, endpoints.listUnpaidJobs)
app.post('/jobs/:id/pay', getProfile, validators.payJobValidator, endpoints.payJob)

app.post('/balances/deposit/:userId', getProfile, validators.depositValidator, endpoints.deposit)

app.get('/admin/best-clients', getProfile, validators.aggregatePaymentsByClientValidator, endpoints.aggregatePaymentsByClient)
app.get('/admin/best-profession', getProfile, validators.aggregatePaymentsByProfessionValidator, endpoints.aggregatePaymentsByProfession)


app.use((err, req, res, next) => {
    if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message, details: err.details })
        return
    }
    logger.error(err)
    res.status(500).json({ error: "Something went wrong on or side" }).end()
})

module.exports = app;
