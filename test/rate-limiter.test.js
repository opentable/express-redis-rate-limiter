import test from 'ava'
import express from 'express'
import bodyParser from 'body-parser'
import request from 'supertest'
import redis from 'redis-js'
// import client from 'redis'
import faker from 'faker'
import rateLimiter from '../lib/express-redis-rate-limiter'

// let redis = client.createClient()
let app
let email
let requestBody
const path = '/forgot-password'
const method = 'post'
const limitBy = 'body.email'

const defaultConfigs = {
  path,
  method,
  limitBy,
  total: 5,
  expiresIn: 50000,
  genStored: req => { return {} },
  decrementAmount: (req, redisInfo) => 1,
  onRateLimited: (req, res, next) => res.sendStatus(429),
  onError: (err, req, res, next) => res.sendStatus(200),
  onPassThrough: res => res.sendStatus(200)
}

test.beforeEach(t => {
  email = faker.internet.email()
  requestBody = {
    name: faker.name.findName(),
    email
  }
  app = express()
  app.use(bodyParser.urlencoded({ extended: false }))
  app.use(bodyParser.json())
})

test.cb('rate limiting a user successfully after two requests', t => {
  const app2 = express() //this is needed since superTest acts against the express app
  //in this case there is a race condition for the shared app
  app2.use(bodyParser.urlencoded({ extended: false }))
  app2.use(bodyParser.json())
  const smallTotalConfigs = Object.assign({}, defaultConfigs)
  smallTotalConfigs.total = 1
  app2.use(rateLimiter(smallTotalConfigs, redis))
  const persistedRequest = Object.assign({}, requestBody)

  request(app2)
  .post(path)
  .send(persistedRequest)
  .expect(200)
  .end( (err, res) => {
    if (err) throw err
    request(app2)
    .post(path)
    .send(persistedRequest)
    .expect(429)
    .end( (err, res) => {
      if (err) throw err
      t.end()
    })
  })
})

test.cb('letting a user through after two requests', t => {
  const app2 = express() //this is needed since superTest acts against the express app
  //in this case there is a race condition for the shared app
  app2.use(bodyParser.urlencoded({ extended: false }))
  app2.use(bodyParser.json())
  const copyConfigs = Object.assign({}, defaultConfigs)
  app2.use(rateLimiter(copyConfigs, redis))
  const persistedRequest = Object.assign({}, requestBody)

  request(app2)
  .post(path)
  .send(persistedRequest)
  .expect(200)
  .end( (err, res) => {
    if (err) throw err
    request(app2)
    .post(path)
    .send(persistedRequest)
    .expect(200)
    .end( (err, res) => {
      if (err) throw err
      t.end()
    })
  })
})

test.cb('lets a whitelisted user through writing a key', t => {
  const whitelistConfigs = Object.assign({}, defaultConfigs)
  whitelistConfigs.decrementAmount = (req, redisInfo) => 0
  const redisKey = `ratelimit:${path}:${method}:${email}:counter`
  app.use(rateLimiter(whitelistConfigs, redis))

  request(app)
  .post(path)
  .send(requestBody)
  .expect(200)
  .end( (err, res) => {
    if (err) throw err
    redis.get(redisKey, (err, res) => {
      if (err) throw err
      t.is(null, res)
      t.end()
    })
  })
})

test.cb('doesnt limit when the expires time passes and the total resets', t => {
  const fastExpireConfigs = Object.assign({}, defaultConfigs)
  fastExpireConfigs.expiresIn = 0
  const redisKey = `ratelimit:${path}:${method}:${email}:counter`
  app.use(rateLimiter(fastExpireConfigs, redis))

  request(app)
  .post(path)
  .send(requestBody)
  .expect(200)
  .end( (err, res) => {
    if (err) throw err
    redis.get(redisKey, (err, res) => {
      if (err) throw err
      t.is(null, res)
      t.end()
    })
  })
})

test.cb('limits based on a custom stored key aka genStored', t => {
  const genStoredConfig = Object.assign({}, defaultConfigs)
  genStoredConfig.genStored = req => { return { testKeyEmail: req.body.email } }
  const customKey = `ratelimit:${path}:${method}:${email}:testKeyEmail`
  const redisKey2 = `ratelimit:${path}:${method}:${email}:counter`
  app.use(rateLimiter(genStoredConfig, redis))

  request(app)
  .post(path)
  .send(requestBody)
  .expect(200)
  .end( (err, res) => {
    if (err) throw err
    redis.get(customKey, (err, res) => {
      if (err) throw err
      t.is(email, res)
      redis.get(redisKey2, (err, res) => {
        if (err) throw err
          const total = (genStoredConfig.total - 1).toString()
          t.is(total, res)
          t.end()
      })
    })
  })
})