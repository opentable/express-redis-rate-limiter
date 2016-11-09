## Redis express rate limiter

[![Coverage Status](https://coveralls.io/repos/github/opentable/redis-express-rate-limiter/badge.svg?branch=master)](https://coveralls.io/github/opentable/redis-express-rate-limiter?branch=master)
[![Build Status](https://travis-ci.org/opentable/redis-express-rate-limiter.svg?branch=master)](https://travis-ci.org/opentable/redis-express-rate-limiter)

### Version requirements
- Express 4 is needed for the new router
- Redis 2.6.12 and above is needed to support the PX modifier on Set commands
- A redis client to pass-in that supports `multi` and `set` commands (I recommend https://github.com/NodeRedis/node_redis)

``` sh
npm install redis-express-rate-limiter --save
```

Simple Example:
``` js
const express = require('express') // please use version 4+
const app = express()
const client = require('redis').createClient()

const rateLimiter = require('redis-express-rate-limiter')

const limiterConfigs = {
  path: '/forgot-password',
  method: 'post',
  limitBy: 'body.email',
  // 50 requests per hour
  total: 50,
  // time is in milliseconds
  expiresIn: 1000 * 60 * 60,
  decrementAmount: (req, redisInfo) => 1,
  onRateLimited: (req, res, next) => res.sendStatus(429),
  onError: (err, req, res, next) => res.sendStatus(500),
  onPassThrough: res => res.sendStatus(200)
}

app.use(rateLimiter(limiterConfigs, client)); //you can also use many limiters each for a different route!

app.post('/forgot-password', (req, res) => {
  res.sendStatus(200)
})
```

### API options aka limiterConfigs

 - `path`: `String` route path to the request
 - `method`: `String` http method. accepts `get`, `post`, `put`, `delete`, and of course Express' `all`
 - `limitBy`: `String` property(s) to call on the express request object to use for the key for rate limiting
 - `total`: `Number` allowed number of requests before getting rate limited
 - `expiresIn`: `Number` amount of time in `ms` before the rate-limited is reset
 - `genStored`: `function(req)` returning an `Object`. Each key in the object is stored as a redis key (in addition to the counter) and can be used in decrementAmount for custom logic
 - `decrementAmount`: `function(req, redisInfo)` returning a `Number`. Used to determine how much to decrement a user's total amount for each attempt. Allows for custom logic to reflect i.e. use a return value of 0 for a whitelist
 - `onRateLimited`: `function(req, res, next)` called when a request exceeds the configured rate limit.
 - `onError`: `function(err, req, res, next)` called when a redis error occurs.
 - `onPassThrough`: `function(res)` called when a request doesn't get rate limited.

### Examples

``` js
// limit by IP address
limiterConfigs = {
  ...
  limitBy: 'connection.remoteAddress'
  ...
}

// or if you are behind a trusted proxy (like nginx)
limiterConfigs = {
  ...
  limitBy: 'headers.x-forwarded-for'
  ...
}

// limit your entire app
limiterConfigs = {
  path: '*',
  method: 'all',
  lookup: 'connection.remoteAddress'
  ...
  limitBy: 'headers.x-forwarded-for'
  ...
}

// whitelist all admins with a very bad admin scheme
limiterConfigs = {
  path: '/forgot-password',
  method: 'post',
  expiresIn: 1000 * 60 * 60,
  decrementAmount: (req, redisInfo) => {
    if (req.body.admin) return 0
    return 1
  }
  ...
}

```

### Special Thanks
https://github.com/ded/express-limiter and ded for inspiration and some of the initial ideas

### License MIT