function TwitterLib(requestTimeout, onAuthenticated, baseUrl, baseAuthorizeUrl, baseSigningUrl) {
  this.remainingHitsCount = 150;
  this.nextHitsReset = 0;
  this.onAuthenticated = onAuthenticated;
  this.oauthLib = new TwitterOAuth(this.onAuthenticated);
  this.requestTimeout = requestTimeout;

  if(!baseUrl.match(/\/$/)) {
    baseUrl = baseUrl + '/';
  }
  TwitterLib.URLS = { BASE: baseUrl, BASE_OAUTH_AUTHORIZE: baseAuthorizeUrl, BASE_SIGNING: baseSigningUrl };
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
    return [this.remainingHitsCount, this.nextHitsReset];
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

  timeline: function(timeline_path, callback, context, count, page, sinceId, maxId) {
    var params = {};
    if(count)
      params.count = count;
    if(page)
      params.page = page;
    if(sinceId)
      params.since_id = sinceId;
    if(maxId)
      params.max_id = maxId;

    this.ajaxRequest(timeline_path, callback, context, params);
  }
};


function TwitterOAuth(onAuthenticated) {
  this.user_id = null;
  this.screen_name = null;
  this.authenticated = false;
  this.onAuthenticated = onAuthenticated;
  this.responseCallback = null;
  this.authenticating = false;
  this.tokenRequested = false;

  var _this = this;
  chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    _this.authenticating = true;
    var pin = request.cr_oauth_pin;
    if(!sender.tab || !sender.tab.url.match(/twitter\.com\/oauth\/authorize/) || !pin)
      return;
    _this.getAccessToken.call(_this, pin, sendResponse);
  });

  var cachedToken = localStorage.oauth_token_data;
  if(cachedToken) {
    setTimeout(function() {
      _this.accessTokenCallback.call(_this, cachedToken);
    }, 0);
  }
}
TwitterOAuth.prototype = {
  getAccessToken: function(pin, callback) {
    this.responseCallback = callback;
    this.makeRequest.call(this, 'oauth/access_token',
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
    var signingUrl = TwitterLib.URLS.BASE_SIGNING + url;
    var signedParams = this.prepareSignedParams(signingUrl, params);
    var requestUrl = TwitterLib.URLS.BASE + url;
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
      localStorage.oauth_token_data = data;
      var paramMap = OAuth.getParameterMap(data);
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
  requestTokenCallback: function(data, status) {
    if(!data) {
      this.error = status;
      console.log('requestTokenCallback error: ' + status);
      alert("Ouch... Something bad happened to Chrome Bird while calling Twitter's API. Request token response: " + status + "\n\nPlease try clicking the icon again to restart the authentication process.");
      return;
    }
    var paramMap = OAuth.getParameterMap(data);
    this.oauth_token = paramMap['oauth_token'];
    this.oauth_token_secret = paramMap['oauth_token_secret'];

    chrome.tabs.create({
      "url": TwitterLib.URLS.BASE_OAUTH_AUTHORIZE + this.oauth_token,
      "selected": true
    });
    this.tokenRequested = true;
  },
  getRequestToken: function() {
    this.oauth_token_secret = '';
    this.oauth_token = null;
    this.makeRequest('oauth/request_token', {}, this.requestTokenCallback);
  }
}