const { Op } = require('sequelize')
const { ValidationError } = require('../exceptions')

class JobService {
    constructor(db) {
        this.models = db.models
        this.db = db
    }

    async getJobById(id) {
        return await this.models.Job.findOne({
            where: {
                id: id
            }
        })
    }


    async payJob(job) {
        if (job.paid) throw new ValidationError('Job already paid')

        const contract = await job.getContract()
        if (contract.status === 'terminated') {
            throw new ValidationError('Contract is terminated')
        }

        const client = await contract.getClient()
        if (client.balance < job.price) {
            throw new ValidationError('Client does not have enough balance')
        }

        const contractor = await contract.getContractor()

        const result = await sequelize.transaction(async (t) => {
            job.paid = true
            job.paymentDate = new Date()
            await job.save({ transaction: t })
            await client.update({ balance: client.balance - job.price }, { transaction: t })
            await contractor.update({ balance: contractor.balance + job.price }, { transaction: t })

            return job
        })

        return result
    }

    async getClientUnpaidJobs(profile) {
        return await this.models.Job.findAll({
            where: {
                paid: null
            },
            include: [{
                model: this.models.Contract,
                where: {
                    [Op.or]: [
                        { clientId: profile.id },
                    ],
                    [Op.not]: [
                        { status: 'terminated' }
                    ]
                }
            }]
        })
    }

    async getContractorUnpaidJobs(profile) {
        return await this.models.Job.findAll({
            where: {
                paid: null
            },
            include: [{
                model: this.models.Contract,
                where: {
                    [Op.or]: [
                        { contractorId: profile.id },
                    ],
                    [Op.not]: [
                        { status: 'terminated' }
                    ]
                }
            }]
        })
    }

    async addBalance(profile, amount) {
        if (!amount || amount <= 0) throw new ValidationError('Invalid amount')

        const unpaidJobs = await this.getClientUnpaidJobs(profile)

        const toBePaidAmount = unpaidJobs.reduce((acc, job) => acc + job.price, 0)


        if (amount > toBePaidAmount * 0.25) {
            throw new ValidationError('Amount is too high')
        }
        profile.balance += amount
        await profile.save()

        return profile
    }


    async aggregatePaymentsByProfession(startDate, endDate) {
        // ORMs are a very powerful tool, but these kinds of queries are where most of them fail.
        // You can use the sequelize API to build the query, but it's very hacky, and not really efficient.
        // The following code would generate the expected output.
        //
        // const result = await this.models.Profile.findAll({
        //     attributes: ['profession', [this.db.fn('SUM', this.db.col('Contractor->Jobs.price')), 'total']],
        //     include: [{
        //         model: this.models.Contract,
        //         attributes: [],
        //         as: 'Contractor',
        //         include: [{
        //             model: this.models.Job,
        //             attributes: [],
        //             where: {
        //                 paymentDate: {
        //                     [Op.between]: [startDate, endDate]
        //                 }
        //             }
        //         }]
        //     }],
        //     group: ['profession'],
        //     order: [[this.db.fn('SUM', this.db.col('Contractor->Jobs.price')), 'DESC']],
        //     raw: true
        // })
        //
        // This code generates the query
        // SELECT `Profile`.`profession`, SUM(`Contractor->Jobs`.`price`) AS `total`
        // FROM `Profiles` AS `Profile`
        // LEFT OUTER JOIN ( 
        //    `Contracts` AS `Contractor` INNER JOIN `Jobs` AS `Contractor->Jobs` 
        //        ON `Contractor`.`id` = `Contractor->Jobs`.`ContractId` 
        //        AND `Contractor->Jobs`.`paymentDate` BETWEEN '2020-08-10 03:00:00.000 +00:00' AND '2020-08-15 03:00:00.000 +00:00'
        // ) ON `Profile`.`id` = `Contractor`.`ContractorId` 
        // GROUP BY `profession`
        // ORDER BY SUM(`Contractor->Jobs`.`price`) DESC;
        //
        // This generates the correct result, but it takes more than twice the time to execute.
        // The raw SQL takes about 8ms to execute, while the sequelize code takes about 20ms.

        const result = await this.db.query(
            `SELECT profession, SUM(price) as total
            FROM jobs
            INNER JOIN contracts ON jobs.contractId = contracts.id
            INNER JOIN profiles ON contracts.contractorId = profiles.id
            WHERE jobs.paymentDate BETWEEN :startDate AND :endDate
            GROUP BY profession
            ORDER BY total DESC`,
            {
                replacements: { startDate, endDate },
                type: this.db.QueryTypes.SELECT
            }
        )

        return result
    }

    async aggregatePaymentsByClient(startDate, endDate, limit = 2) {
        const result = await this.db.query(
            `SELECT profiles.id, profiles.firstName, profiles.LastName, SUM(price) as paid
            FROM jobs
            INNER JOIN contracts ON jobs.contractId = contracts.id
            INNER JOIN profiles ON contracts.clientId = profiles.id
            WHERE jobs.paymentDate BETWEEN :startDate AND :endDate
            GROUP BY profiles.id, profiles.firstName, profiles.LastName
            ORDER BY paid DESC
            LIMIT :limit`,
            {
                replacements: { startDate, endDate, limit },
                type: this.db.QueryTypes.SELECT
            }
        )

        // Using a map to transform the result because concat functions are DB specific
        return result.map((r) => ({ id: r.id, fullName: `${r.firstName} ${r.lastName}`, paid: r.paid }))
    }
}

module.exports = JobService