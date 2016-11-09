'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var rateLimiter = function rateLimiter(options, redisClient) {
  var router = _express2.default.Router();

  return router[options.method](options.path, function (req, res, next) {
    var limitByOpts = options.limitBy.split('.');
    var userStoredObj = options.genStored && options.genStored(req) || {};

    var limitBy = req;
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = limitByOpts[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var property = _step.value;

        limitBy = limitBy[property];
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    var redisKey = 'ratelimit:' + options.path + ':' + options.method + ':' + limitBy + ':';
    var counterKey = redisKey + 'counter';

    var multiCommand = redisClient.multi().get(counterKey);
    var commandKeyMap = {};
    var customKeyLoc = 1; //ignore the first response that is the counter in the response
    for (var key in userStoredObj) {
      multiCommand.get(redisKey + key);
      commandKeyMap[customKeyLoc] = key;
      customKeyLoc += 1;
    }

    multiCommand.exec(function (err, responses) {
      if (err || responses.length - 1 !== Object.keys(userStoredObj).length) return options.onError(err, req, res, next);

      var formattedForUserResponse = {};
      for (var i = 1; i < responses.length; i++) {
        formattedForUserResponse[commandKeyMap[i]] = responses[i];
      }

      var decrementAmount = options.decrementAmount(req, formattedForUserResponse);
      if (decrementAmount === 0) return options.onPassThrough(res, next);
      if (responses[0] && parseInt(responses[0], 10) - decrementAmount < 0) {
        return options.onRateLimited(req, res, next);
      }

      var multiCall = redisClient.multi();

      if (responses[0] === null) {
        multiCall.set(counterKey, options.total - decrementAmount, 'PX', options.expiresIn);
        for (var _key in userStoredObj) {
          multiCall.set(redisKey + _key, userStoredObj[_key], 'PX', options.expiresIn);
        }
      } else {
        multiCall.decrby(counterKey, decrementAmount);
      }

      multiCall.exec(function (err, responses) {
        if (err || responses.length - 1 !== Object.keys(userStoredObj).length) return options.onError(err, req, res, next);

        if (options.total - decrementAmount < 0) return options.onRateLimited(req, res, next);

        return options.onPassThrough(res, next);
      });
    });
  });
};

exports.default = rateLimiter;
