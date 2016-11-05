'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var router = _express2.default.Router();

var middleware = function middleware(options, redisClient) {
  return router[options.method](options.path, function (req, res, next) {
    var limitByOpts = options.limitBy.split('.');
    var userStoredObj = options.genStored(req) || {};

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

exports.default = middleware;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4cHJlc3MtcmVkaXMtcmF0ZS1saW1pdGVyLmpzIl0sIm5hbWVzIjpbInJvdXRlciIsIlJvdXRlciIsIm1pZGRsZXdhcmUiLCJvcHRpb25zIiwicmVkaXNDbGllbnQiLCJtZXRob2QiLCJwYXRoIiwicmVxIiwicmVzIiwibmV4dCIsImxpbWl0QnlPcHRzIiwibGltaXRCeSIsInNwbGl0IiwidXNlclN0b3JlZE9iaiIsImdlblN0b3JlZCIsInByb3BlcnR5IiwicmVkaXNLZXkiLCJjb3VudGVyS2V5IiwibXVsdGlDb21tYW5kIiwibXVsdGkiLCJnZXQiLCJjb21tYW5kS2V5TWFwIiwiY3VzdG9tS2V5TG9jIiwia2V5IiwiZXhlYyIsImVyciIsInJlc3BvbnNlcyIsImxlbmd0aCIsIk9iamVjdCIsImtleXMiLCJvbkVycm9yIiwiZm9ybWF0dGVkRm9yVXNlclJlc3BvbnNlIiwiaSIsImRlY3JlbWVudEFtb3VudCIsIm9uUGFzc1Rocm91Z2giLCJwYXJzZUludCIsIm9uUmF0ZUxpbWl0ZWQiLCJtdWx0aUNhbGwiLCJzZXQiLCJ0b3RhbCIsImV4cGlyZXNJbiIsImRlY3JieSJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7Ozs7OztBQUVBLElBQU1BLFNBQVMsa0JBQVFDLE1BQVIsRUFBZjs7QUFFQSxJQUFNQyxhQUFhLFNBQWJBLFVBQWEsQ0FBQ0MsT0FBRCxFQUFVQyxXQUFWLEVBQTBCO0FBQzNDLFNBQU9KLE9BQU9HLFFBQVFFLE1BQWYsRUFBdUJGLFFBQVFHLElBQS9CLEVBQXFDLFVBQUNDLEdBQUQsRUFBTUMsR0FBTixFQUFXQyxJQUFYLEVBQW9CO0FBQzlELFFBQU1DLGNBQWNQLFFBQVFRLE9BQVIsQ0FBZ0JDLEtBQWhCLENBQXNCLEdBQXRCLENBQXBCO0FBQ0EsUUFBTUMsZ0JBQWdCVixRQUFRVyxTQUFSLENBQWtCUCxHQUFsQixLQUEwQixFQUFoRDs7QUFFQSxRQUFJSSxVQUFVSixHQUFkO0FBSjhEO0FBQUE7QUFBQTs7QUFBQTtBQUs5RCwyQkFBdUJHLFdBQXZCLDhIQUFxQztBQUFBLFlBQTFCSyxRQUEwQjs7QUFDbkNKLGtCQUFVQSxRQUFRSSxRQUFSLENBQVY7QUFDRDtBQVA2RDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBOztBQVE5RCxRQUFNQywwQkFBd0JiLFFBQVFHLElBQWhDLFNBQXdDSCxRQUFRRSxNQUFoRCxTQUEwRE0sT0FBMUQsTUFBTjtBQUNBLFFBQU1NLGFBQWFELFdBQVcsU0FBOUI7O0FBRUEsUUFBSUUsZUFBZWQsWUFBWWUsS0FBWixHQUFvQkMsR0FBcEIsQ0FBd0JILFVBQXhCLENBQW5CO0FBQ0EsUUFBSUksZ0JBQWdCLEVBQXBCO0FBQ0EsUUFBSUMsZUFBZSxDQUFuQixDQWI4RCxDQWF6QztBQUNyQixTQUFLLElBQU1DLEdBQVgsSUFBa0JWLGFBQWxCLEVBQWlDO0FBQy9CSyxtQkFBYUUsR0FBYixDQUFpQkosV0FBV08sR0FBNUI7QUFDQUYsb0JBQWNDLFlBQWQsSUFBOEJDLEdBQTlCO0FBQ0FELHNCQUFnQixDQUFoQjtBQUNEOztBQUVESixpQkFBYU0sSUFBYixDQUFtQixVQUFDQyxHQUFELEVBQU1DLFNBQU4sRUFBb0I7QUFDckMsVUFBSUQsT0FBT0MsVUFBVUMsTUFBVixHQUFtQixDQUFuQixLQUF5QkMsT0FBT0MsSUFBUCxDQUFZaEIsYUFBWixFQUEyQmMsTUFBL0QsRUFBdUUsT0FBT3hCLFFBQVEyQixPQUFSLENBQWdCTCxHQUFoQixFQUFxQmxCLEdBQXJCLEVBQTBCQyxHQUExQixFQUErQkMsSUFBL0IsQ0FBUDs7QUFFdkUsVUFBSXNCLDJCQUEyQixFQUEvQjtBQUNBLFdBQUssSUFBSUMsSUFBSSxDQUFiLEVBQWdCQSxJQUFJTixVQUFVQyxNQUE5QixFQUFzQ0ssR0FBdEMsRUFBMkM7QUFDekNELGlDQUF5QlYsY0FBY1csQ0FBZCxDQUF6QixJQUE2Q04sVUFBVU0sQ0FBVixDQUE3QztBQUNEOztBQUVELFVBQU1DLGtCQUFrQjlCLFFBQVE4QixlQUFSLENBQXdCMUIsR0FBeEIsRUFBNkJ3Qix3QkFBN0IsQ0FBeEI7QUFDQSxVQUFJRSxvQkFBb0IsQ0FBeEIsRUFBMkIsT0FBTzlCLFFBQVErQixhQUFSLENBQXNCMUIsR0FBdEIsRUFBMkJDLElBQTNCLENBQVA7QUFDM0IsVUFBSWlCLFVBQVUsQ0FBVixLQUFnQlMsU0FBU1QsVUFBVSxDQUFWLENBQVQsRUFBdUIsRUFBdkIsSUFBNkJPLGVBQTdCLEdBQStDLENBQW5FLEVBQXNFO0FBQ3BFLGVBQU85QixRQUFRaUMsYUFBUixDQUFzQjdCLEdBQXRCLEVBQTJCQyxHQUEzQixFQUFnQ0MsSUFBaEMsQ0FBUDtBQUNEOztBQUVELFVBQUk0QixZQUFZakMsWUFBWWUsS0FBWixFQUFoQjs7QUFFQSxVQUFJTyxVQUFVLENBQVYsTUFBaUIsSUFBckIsRUFBMkI7QUFDekJXLGtCQUFVQyxHQUFWLENBQWNyQixVQUFkLEVBQTBCZCxRQUFRb0MsS0FBUixHQUFnQk4sZUFBMUMsRUFBMkQsSUFBM0QsRUFBaUU5QixRQUFRcUMsU0FBekU7QUFDQSxhQUFLLElBQU1qQixJQUFYLElBQWtCVixhQUFsQixFQUFpQztBQUMvQndCLG9CQUFVQyxHQUFWLENBQWN0QixXQUFXTyxJQUF6QixFQUE4QlYsY0FBY1UsSUFBZCxDQUE5QixFQUFrRCxJQUFsRCxFQUF3RHBCLFFBQVFxQyxTQUFoRTtBQUNEO0FBQ0YsT0FMRCxNQUtPO0FBQ0xILGtCQUFVSSxNQUFWLENBQWlCeEIsVUFBakIsRUFBNkJnQixlQUE3QjtBQUNEOztBQUVESSxnQkFBVWIsSUFBVixDQUFnQixVQUFDQyxHQUFELEVBQU1DLFNBQU4sRUFBb0I7QUFDbEMsWUFBSUQsT0FBT0MsVUFBVUMsTUFBVixHQUFtQixDQUFuQixLQUF5QkMsT0FBT0MsSUFBUCxDQUFZaEIsYUFBWixFQUEyQmMsTUFBL0QsRUFBdUUsT0FBT3hCLFFBQVEyQixPQUFSLENBQWdCTCxHQUFoQixFQUFxQmxCLEdBQXJCLEVBQTBCQyxHQUExQixFQUErQkMsSUFBL0IsQ0FBUDs7QUFFdkUsWUFBSU4sUUFBUW9DLEtBQVIsR0FBZ0JOLGVBQWhCLEdBQWtDLENBQXRDLEVBQXlDLE9BQU85QixRQUFRaUMsYUFBUixDQUFzQjdCLEdBQXRCLEVBQTJCQyxHQUEzQixFQUFnQ0MsSUFBaEMsQ0FBUDs7QUFFekMsZUFBT04sUUFBUStCLGFBQVIsQ0FBc0IxQixHQUF0QixFQUEyQkMsSUFBM0IsQ0FBUDtBQUNELE9BTkQ7QUFPRCxLQWhDRDtBQWlDRCxHQXJETSxDQUFQO0FBc0RELENBdkREOztrQkF5RGVQLFUiLCJmaWxlIjoiZXhwcmVzcy1yZWRpcy1yYXRlLWxpbWl0ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZXhwcmVzcyBmcm9tICdleHByZXNzJ1xuXG5jb25zdCByb3V0ZXIgPSBleHByZXNzLlJvdXRlcigpXG5cbmNvbnN0IG1pZGRsZXdhcmUgPSAob3B0aW9ucywgcmVkaXNDbGllbnQpID0+IHtcbiAgcmV0dXJuIHJvdXRlcltvcHRpb25zLm1ldGhvZF0ob3B0aW9ucy5wYXRoLCAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBjb25zdCBsaW1pdEJ5T3B0cyA9IG9wdGlvbnMubGltaXRCeS5zcGxpdCgnLicpXG4gICAgY29uc3QgdXNlclN0b3JlZE9iaiA9IG9wdGlvbnMuZ2VuU3RvcmVkKHJlcSkgfHwge31cblxuICAgIGxldCBsaW1pdEJ5ID0gcmVxXG4gICAgZm9yIChjb25zdCBwcm9wZXJ0eSBvZiBsaW1pdEJ5T3B0cyApIHtcbiAgICAgIGxpbWl0QnkgPSBsaW1pdEJ5W3Byb3BlcnR5XVxuICAgIH1cbiAgICBjb25zdCByZWRpc0tleSA9IGByYXRlbGltaXQ6JHtvcHRpb25zLnBhdGh9OiR7b3B0aW9ucy5tZXRob2R9OiR7bGltaXRCeX06YFxuICAgIGNvbnN0IGNvdW50ZXJLZXkgPSByZWRpc0tleSArICdjb3VudGVyJ1xuXG4gICAgbGV0IG11bHRpQ29tbWFuZCA9IHJlZGlzQ2xpZW50Lm11bHRpKCkuZ2V0KGNvdW50ZXJLZXkpXG4gICAgbGV0IGNvbW1hbmRLZXlNYXAgPSB7fVxuICAgIGxldCBjdXN0b21LZXlMb2MgPSAxIC8vaWdub3JlIHRoZSBmaXJzdCByZXNwb25zZSB0aGF0IGlzIHRoZSBjb3VudGVyIGluIHRoZSByZXNwb25zZVxuICAgIGZvciAoY29uc3Qga2V5IGluIHVzZXJTdG9yZWRPYmopIHtcbiAgICAgIG11bHRpQ29tbWFuZC5nZXQocmVkaXNLZXkgKyBrZXkpXG4gICAgICBjb21tYW5kS2V5TWFwW2N1c3RvbUtleUxvY10gPSBrZXlcbiAgICAgIGN1c3RvbUtleUxvYyArPSAxXG4gICAgfVxuXG4gICAgbXVsdGlDb21tYW5kLmV4ZWMoIChlcnIsIHJlc3BvbnNlcykgPT4ge1xuICAgICAgaWYgKGVyciB8fCByZXNwb25zZXMubGVuZ3RoIC0gMSAhPT0gT2JqZWN0LmtleXModXNlclN0b3JlZE9iaikubGVuZ3RoKSByZXR1cm4gb3B0aW9ucy5vbkVycm9yKGVyciwgcmVxLCByZXMsIG5leHQpXG5cbiAgICAgIGxldCBmb3JtYXR0ZWRGb3JVc2VyUmVzcG9uc2UgPSB7fVxuICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCByZXNwb25zZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZm9ybWF0dGVkRm9yVXNlclJlc3BvbnNlW2NvbW1hbmRLZXlNYXBbaV1dID0gcmVzcG9uc2VzW2ldXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRlY3JlbWVudEFtb3VudCA9IG9wdGlvbnMuZGVjcmVtZW50QW1vdW50KHJlcSwgZm9ybWF0dGVkRm9yVXNlclJlc3BvbnNlKVxuICAgICAgaWYgKGRlY3JlbWVudEFtb3VudCA9PT0gMCkgcmV0dXJuIG9wdGlvbnMub25QYXNzVGhyb3VnaChyZXMsIG5leHQpXG4gICAgICBpZiAocmVzcG9uc2VzWzBdICYmIHBhcnNlSW50KHJlc3BvbnNlc1swXSwgMTApIC0gZGVjcmVtZW50QW1vdW50IDwgMCkge1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5vblJhdGVMaW1pdGVkKHJlcSwgcmVzLCBuZXh0KVxuICAgICAgfVxuXG4gICAgICBsZXQgbXVsdGlDYWxsID0gcmVkaXNDbGllbnQubXVsdGkoKVxuXG4gICAgICBpZiAocmVzcG9uc2VzWzBdID09PSBudWxsKSB7XG4gICAgICAgIG11bHRpQ2FsbC5zZXQoY291bnRlcktleSwgb3B0aW9ucy50b3RhbCAtIGRlY3JlbWVudEFtb3VudCwgJ1BYJywgb3B0aW9ucy5leHBpcmVzSW4pXG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIHVzZXJTdG9yZWRPYmopIHtcbiAgICAgICAgICBtdWx0aUNhbGwuc2V0KHJlZGlzS2V5ICsga2V5LCB1c2VyU3RvcmVkT2JqW2tleV0sICdQWCcsIG9wdGlvbnMuZXhwaXJlc0luKVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtdWx0aUNhbGwuZGVjcmJ5KGNvdW50ZXJLZXksIGRlY3JlbWVudEFtb3VudClcbiAgICAgIH1cblxuICAgICAgbXVsdGlDYWxsLmV4ZWMoIChlcnIsIHJlc3BvbnNlcykgPT4ge1xuICAgICAgICBpZiAoZXJyIHx8IHJlc3BvbnNlcy5sZW5ndGggLSAxICE9PSBPYmplY3Qua2V5cyh1c2VyU3RvcmVkT2JqKS5sZW5ndGgpIHJldHVybiBvcHRpb25zLm9uRXJyb3IoZXJyLCByZXEsIHJlcywgbmV4dClcblxuICAgICAgICBpZiAob3B0aW9ucy50b3RhbCAtIGRlY3JlbWVudEFtb3VudCA8IDApIHJldHVybiBvcHRpb25zLm9uUmF0ZUxpbWl0ZWQocmVxLCByZXMsIG5leHQpXG5cbiAgICAgICAgcmV0dXJuIG9wdGlvbnMub25QYXNzVGhyb3VnaChyZXMsIG5leHQpXG4gICAgICB9KVxuICAgIH0pXG4gIH0pXG59XG5cbmV4cG9ydCBkZWZhdWx0IG1pZGRsZXdhcmUiXX0=
