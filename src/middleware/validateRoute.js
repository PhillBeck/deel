const Ajv = require('ajv')
const { ValidationError } = require('../exceptions')
const addFormats = require('ajv-formats')

const validateRoute = routeSchema => {
    let ajv = null

    const validators = {}

    // Compiling query schema beforehand
    if (Object.prototype.hasOwnProperty.call(routeSchema, 'query')) {
        ajv = new Ajv({ coerceTypes: true })
        addFormats(ajv)
        validators.query = ajv.compile(routeSchema.query)
    }

    // Compiling params schema beforehand
    if (Object.prototype.hasOwnProperty.call(routeSchema, 'params')) {
        // We coerce types on params because they cann only be strings
        // since they are part of an url
        ajv = new Ajv({ coerceTypes: true })
        addFormats(ajv)
        validators.params = ajv.compile(routeSchema.params)
    }

    // Compiling body schema beforehand
    if (Object.prototype.hasOwnProperty.call(routeSchema, 'body')) {
        ajv = new Ajv()
        addFormats(ajv)
        validators.body = ajv.compile(routeSchema.body)
    }

    // The actual middleware that gets loaded by express
    // has already-compiled validators
    return (req, res, next) => {
        let validation = null

        if (Object.prototype.hasOwnProperty.call(validators, 'params')) {
            validation = ajv.validate(routeSchema.params, req.params)
            if (!validation) {
                return next(new ValidationError('Request url parameters validation failed', ajv.errorsText()))
            }
        }

        if (Object.prototype.hasOwnProperty.call(validators, 'query')) {
            validation = ajv.validate(routeSchema.query, req.query)
            if (!validation) {
                return next(new ValidationError('Request query validation failed', ajv.errorsText()))
            }
        }

        if (Object.prototype.hasOwnProperty.call(validators, 'body')) {
            validation = ajv.validate(routeSchema.body, req.body)
            if (!validation) {
                return next(new ValidationError('Request body validation failed', ajv.errorsText()))
            }
        }

        return next()
    }
}

module.exports = {
    validateRoute: validateRoute
}