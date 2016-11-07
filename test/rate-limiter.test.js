import test from 'ava'
import express from 'express'
import bodyParser from 'body-parser'
import request from 'supertest'
import sinon from 'sinon'
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
  onError: (err, req, res, next) => res.sendStatus(500),
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

const expressFactory = () => {
  const temp = express()
  temp.use(bodyParser.urlencoded({ extended: false }))
  temp.use(bodyParser.json())
  return temp
}

test.cb('rate limiting a user successfully after two requests', t => {
  const genedApp = expressFactory()
  const smallTotalConfigs = Object.assign({}, defaultConfigs)
  smallTotalConfigs.total = 1
  genedApp.use(rateLimiter(smallTotalConfigs, redis))
  const persistedRequest = Object.assign({}, requestBody)

  request(genedApp)
  .post(path)
  .send(persistedRequest)
  .expect(200)
  .end( (err, res) => {
    if (err) throw err
    request(genedApp)
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
  const genedApp = expressFactory()
  const copyConfigs = Object.assign({}, defaultConfigs)
  genedApp.use(rateLimiter(copyConfigs, redis))
  const persistedRequest = Object.assign({}, requestBody)

  request(genedApp)
  .post(path)
  .send(persistedRequest)
  .expect(200)
  .end( (err, res) => {
    if (err) throw err
    request(genedApp)
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