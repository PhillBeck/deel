const { ValidationError } = require('../exceptions')
const { Op } = require('sequelize')


async function readContract(req, res) {
    const { Contract } = req.app.get('models')
    const { id } = req.params
    const contract = await Contract.findOne({
        where: {
            id: id,
            [Op.or]: [
                { clientId: req.profile.id },
                { contractorId: req.profile.id }
            ]
        }
    })
    if (!contract) return res.status(404).end()
    res.json(contract)
}


async function listContracts(req, res) {
    const { Contract } = req.app.get('models')
    const contracts = await Contract.findAll({
        where: {
            [Op.not]: {
                status: 'terminated'
            },
            [Op.or]: [
                { clientId: req.profile.id },
                { contractorId: req.profile.id }
            ]
        }
    })
    res.json(contracts)
}


async function payJob(req, res) {
    const { id } = req.params
    const { jobService } = req.app.get('services')
    const job = await jobService.getJobById(id)

    if (!job) return res.status(404).end()

    const contract = await job.getContract()
    if (contract.clientId != req.profile.id) {
        return res.status(403).end()
    }

    try {
        const result = await jobService.payJob(job)
        res.json(result)
    } catch (e) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message })
            return
        }
        throw e
    }
}


async function deposit(req, res) {
    const { userId } = req.params
    const { jobService } = req.app.get('services')
    const { amount } = req.body

    if (userId != req.profile.id) {
        return res.status(403).end()
    }

    try {
        const result = await jobService.addBalance(req.profile, amount)
        res.json(result)

    } catch (e) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message })
            return
        }
        throw e
    }
}


async function listUnpaidJobs(req, res) {
    const { jobService } = req.app.get('services')
    const clientJobs = await jobService.getClientUnpaidJobs(req.profile)
    const contractorJobs = await jobService.getContractorUnpaidJobs(req.profile)
    res.json(clientJobs.concat(contractorJobs))
}


async function aggregatePaymentsByClient(req, res) {
    const { jobService } = req.app.get('services')
    const { start, end, limit } = req.query
    const startDate = new Date(start)
    const endDate = new Date(end)
    if (startDate > endDate) {
        return res.status(400).json({ error: 'Start date must be before end date' }).end()
    }

    const payments = await jobService.aggregatePaymentsByClient(start, end, limit)
    res.json(payments)
}

async function aggregatePaymentsByProfession(req, res) {
    const { jobService } = req.app.get('services')
    const { start, end } = req.query
    const startDate = new Date(start)
    const endDate = new Date(end)
    if (startDate > endDate) {
        return res.status(400).json({ error: 'Start date must be before end date' }).end()
    }
    const payments = await jobService.aggregatePaymentsByProfession(start, end)
    if (!payments.length) {
        return res.status(404).end()
    }
    res.json(payments[0])
}

module.exports = {
    listContracts,
    readContract,
    payJob,
    listUnpaidJobs,
    deposit,
    aggregatePaymentsByClient,
    aggregatePaymentsByProfession
}