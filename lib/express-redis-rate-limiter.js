import express from 'express'

const rateLimiter = (options, redisClient) => {
  const router = express.Router()

  return router[options.method](options.path, (req, res, next) => {
    const limitByOpts = options.limitBy.split('.')
    const userStoredObj = options.genStored(req) || {}

    let limitBy = req
    for (const property of limitByOpts ) {
      limitBy = limitBy[property]
    }
    const redisKey = `ratelimit:${options.path}:${options.method}:${limitBy}:`
    const counterKey = redisKey + 'counter'

    let multiCommand = redisClient.multi().get(counterKey)
    let commandKeyMap = {}
    let customKeyLoc = 1 //ignore the first response that is the counter in the response
    for (const key in userStoredObj) {
      multiCommand.get(redisKey + key)
      commandKeyMap[customKeyLoc] = key
      customKeyLoc += 1
    }

    multiCommand.exec( (err, responses) => {
      if (err || responses.length - 1 !== Object.keys(userStoredObj).length) return options.onError(err, req, res, next)

      let formattedForUserResponse = {}
      for (let i = 1; i < responses.length; i++) {
        formattedForUserResponse[commandKeyMap[i]] = responses[i]
      }

      const decrementAmount = options.decrementAmount(req, formattedForUserResponse)
      if (decrementAmount === 0) return options.onPassThrough(res, next)
      if (responses[0] && parseInt(responses[0], 10) - decrementAmount < 0) {
        return options.onRateLimited(req, res, next)
      }

      let multiCall = redisClient.multi()

      if (responses[0] === null) {
        multiCall.set(counterKey, options.total - decrementAmount, 'PX', options.expiresIn)
        for (const key in userStoredObj) {
          multiCall.set(redisKey + key, userStoredObj[key], 'PX', options.expiresIn)
        }
      } else {
        multiCall.decrby(counterKey, decrementAmount)
      }

      multiCall.exec( (err, responses) => {
        if (err || responses.length - 1 !== Object.keys(userStoredObj).length) return options.onError(err, req, res, next)

        if (options.total - decrementAmount < 0) return options.onRateLimited(req, res, next)

        return options.onPassThrough(res, next)
      })
    })
  })
}

export default rateLimiter