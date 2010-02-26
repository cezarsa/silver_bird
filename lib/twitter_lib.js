function TwitterLib(requestTimeout, onAuthenticated, onHitsUpdated, baseUrl, baseOauthUrl, baseSigningUrl, baseOauthSigningUrl, oauthTokenData) {
  this.remainingHitsCount = 150;
  this.nextHitsReset = 0;
  this.onAuthenticated = onAuthenticated;
  this.onHitsUpdated = onHitsUpdated;
  this.hourlyLimit = 150;
  var _this = this;
  this.oauthLib = new TwitterOAuth(oauthTokenData, function() {
    _this.updateHourlyHitsLimit.call(_this)
    _this.onAuthenticated();
  });
  this.requestTimeout = requestTimeout;

  if(!baseUrl.match(/\/$/)) {
    baseUrl = baseUrl + '/';
  }
  TwitterLib.URLS = { BASE: baseUrl, BASE_OAUTH: baseOauthUrl, BASE_SIGNING: baseSigningUrl, BASE_OAUTH_SIGNING: baseOauthSigningUrl};
}
TwitterLib.prototype = {
  username: function() {
    return this.oauthLib.screen_name;
  },
  authenticated: function() {
    return this.oauthLib.authenticated;
  },
  tokenRequested: function() {
    return this.oauthLib.tokenRequested;
  },
  authenticating: function() {
    return this.oauthLib.authenticating;
  },
  startAuthentication: function() {
    if(!this.oauthLib.authenticating) {
      this.oauthLib.getRequestToken();
    }
  },
  ajaxRequest: function(url, callback, context, params, httpMethod) {
    if(!httpMethod)
      httpMethod = "GET";
    if(!params)
      params = {};
    var signingUrl = TwitterLib.URLS.BASE_SIGNING + url + ".json";
    var signedParams = this.oauthLib.prepareSignedParams(signingUrl, params, httpMethod);
    var requestUrl = TwitterLib.URLS.BASE + url + ".json";
    var _this = this;
    $.ajax({
      type: httpMethod,
      url: requestUrl,
      data: signedParams,
      dataType: "json",
      timeout: this.requestTimeout,
      success: function(data, status) {
        _this.normalizeTweets(data);
        callback(true, data, status, context);
      },
      error: function (request, status, error) {
        var fmtError = '';
        try {
          var rspObj = JSON.parse(request.responseText);
          fmtError = '"' + rspObj.error + '"(' + request.statusText + ')';
        } catch(e) {
          fmtError = '"' + error + '"(' + status + ')';
        }
        callback(false, null, fmtError, context);
      },
      complete: function(request) {
        if(!request) return;
        try {
          var remaining = request.getResponseHeader("X-RateLimit-Remaining");
          if(remaining) {
            _this.remainingHitsCount = remaining;
            _this.nextHitsReset = request.getResponseHeader("X-RateLimit-Reset");

            _this.onHitsUpdated(_this.remainingHitsCount, _this.nextHitsReset, _this.hourlyLimit);
          }
        } catch(e) { /* ignoring */ }
      }
    });
  },

  normalizeTweets: function(tweets) {
    for(var i = 0; i < tweets.length; ++i) {
      var ti = tweets[i];
      if(!ti.user) {
        ti.user = ti.sender;
      }
    }
  },

  remainingHitsInfo: function() {
    return [this.remainingHitsCount, this.nextHitsReset, this.hourlyLimit];
  },

  updateHourlyHitsLimit: function() {
    var _this = this;
    this.ajaxRequest("account/rate_limit_status", function(success, data) {
      if(success) {
        _this.hourlyLimit = data.hourly_limit;
      }
    });
  },

  tweet: function(callback, msg, replyId) {
    var params = { status: msg };
    if(replyId) {
      params.in_reply_to_status_id = replyId;
    }
    this.ajaxRequest('statuses/update', callback, null, params, "POST");
  },

  retweet: function(callback, id) {
    this.ajaxRequest('statuses/retweet/' + id, callback, null, null, "POST");
  },

  destroy: function(callback, id) {
    this.ajaxRequest('statuses/destroy/' + id, callback, null, null, "POST");
  },

  destroyDM: function(callback, id) {
    this.ajaxRequest('direct_messages/destroy/' + id, callback, null, null, "POST");
  },

  favorite: function(callback, id) {
    this.ajaxRequest('favorites/create/' + id, callback, null, null, "POST");
  },

  unFavorite: function(callback, id) {
    this.ajaxRequest('favorites/destroy/' + id, callback, null, null, "POST");
  },

  lists: function(callback) {
    this.ajaxRequest(this.username() + '/lists', callback, null, null, "GET");
  },

  timeline: function(timeline_path, callback, context, params) {
    this.ajaxRequest(timeline_path, callback, context, params);
  },
};

var globalOAuthInstance;
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  if(!globalOAuthInstance)
    return;
  if(request.check_pin_needed) {
    if(!globalOAuthInstance.authenticated && globalOAuthInstance.tokenRequested) {
      sendResponse({});
    }
    return;
  }
  var pin = request.cr_oauth_pin;
  if(pin) {
    globalOAuthInstance.authenticating = true;
    globalOAuthInstance.getAccessToken.call(globalOAuthInstance, pin, sendResponse);
  }
});

function TwitterOAuth(oauthTokenData, onAuthenticated) {
  this.user_id = null;
  this.screen_name = null;
  this.authenticated = false;
  this.onAuthenticated = onAuthenticated;
  this.responseCallback = null;
  this.authenticating = false;
  this.tokenRequested = false;
  this.timeAdjusted = false;
  this.oauthTokenData = oauthTokenData;
  globalOAuthInstance = this;

  var _this = this;
  var cachedToken = this.oauthTokenData.val();
  if(cachedToken) {
    this.authenticating = true;
    this.tokenRequested = true;
    setTimeout(function() {
      _this.accessTokenCallback.call(_this, cachedToken);
    }, 0);
  }
}
TwitterOAuth.prototype = {
  getAccessToken: function(pin, callback) {
    this.responseCallback = callback;
    this.makeRequest.call(this, 'access_token',
      { oauth_verifier: pin }, this.accessTokenCallback);
  },
  prepareSignedParams: function(url, params, httpMethod) {
    var accessor = {
      consumerSecret: 'MsuvABdvwSn2ezvdQzN4uiRR44JK8jESTIJ1hrhe0U',
      tokenSecret: this.oauth_token_secret
    };
    if(!httpMethod)
      httpMethod = 'POST';
    var message = {
      action: url,
      method: httpMethod,
      parameters: [
        ['oauth_consumer_key', 'KkrTiBu0hEMJ9dqS3YCxw'],
        ['oauth_signature_method', 'HMAC-SHA1']
      ]
    };
    if(this.oauth_token) {
      OAuth.setParameter(message, 'oauth_token', this.oauth_token);
    }
    for(var p in params) {
      OAuth.setParameter(message, p, params[p]);
    }
    OAuth.completeRequest(message, accessor);
    return OAuth.getParameterMap(message.parameters);
  },
  makeRequest: function(url, params, callback) {
    var signingUrl = TwitterLib.URLS.BASE_OAUTH_SIGNING + url;
    var signedParams = this.prepareSignedParams(signingUrl, params);
    var requestUrl = TwitterLib.URLS.BASE_OAUTH + url;
    var _this = this;
    $.ajax({
      type: 'POST',
      url: requestUrl,
      data: signedParams,
      timeout: 6000,
      success: function(data, status) {
        callback.call(_this, data);
      },
      error: function (request, status, error) {
        var fmtError = '';
        try {
          if(!_this.timeAdjusted) {
            var serverTimestamp = Date.parse(request.getResponseHeader("Last-Modified"));
            OAuth.correctTimestamp(serverTimestamp / 1000);
            _this.timeAdjusted = true;
            callback.call(_this, null, null, true);
            return;
          }
          fmtError = '"' + request.responseText + '"(' + request.statusText + ')';
        } catch(e) {
          fmtError = '"' + error + '"(' + status + ')';
        }
        callback.call(_this, null, fmtError);
      }
    });
  },
  accessTokenCallback: function(data, status) {
    this.authenticating = false;
    var success = true;
    if(!data) {
      success = false;
      this.error = status;
      console.log('accessTokenCallback error: ' + status);
    } else {
      var paramMap = OAuth.getParameterMap(data);
      this.oauthTokenData.save(data);
      this.oauth_token = paramMap['oauth_token'];
      this.oauth_token_secret = paramMap['oauth_token_secret'];
      this.user_id = paramMap['user_id'];
      this.screen_name = paramMap['screen_name'];
      this.authenticated = true;
      if(this.onAuthenticated) {
        this.onAuthenticated();
      }
    }
    if(this.responseCallback) {
      try {
        this.responseCallback(success);
      } catch(e) { /* ignoring */ }
    }
  },
  requestTokenCallback: function(data, status, tryAgain) {
    var _this = this;
    var alertRequestError = function(errorMsg) {
      _this.error = errorMsg;
      console.log('requestTokenCallback error: ' + errorMsg);
      alert("Ouch... Something bad happened to Chrome Bird while calling Twitter's API. Request token response: " + errorMsg +
            "\n\nThis problem is probably due to incorrect date and time settings in your operating system. Please, review your settings and try again.");
    };
    if(!data) {
      if(tryAgain) {
        this.getRequestToken();
        return;
      }
      alertRequestError(status);
      return;
    }

    var paramMap = OAuth.getParameterMap(data);
    this.oauth_token = paramMap['oauth_token'];
    this.oauth_token_secret = paramMap['oauth_token_secret'];

    if(!this.oauth_token || !this.oauth_token_secret) {
      alertRequestError("Invalid oauth_token: " + data);
      return;
    }

    chrome.tabs.create({
      "url": TwitterLib.URLS.BASE_OAUTH + 'authorize?oauth_token=' + this.oauth_token,
      "selected": true
    });
    this.tokenRequested = true;
  },
  getRequestToken: function() {
    this.oauth_token_secret = '';
    this.oauth_token = null;
    this.makeRequest('request_token', {}, this.requestTokenCallback);
  }
}