function TwitterLib(onAuthenticated) {
  this.remainingHitsCount = 150;
  this.onAuthenticated = onAuthenticated;
  this.oauthLib = new TwitterOAuth(this.onAuthenticated);
}
TwitterLib.URLS = {
  BASE: 'http://twitter.com/',
  SEARCH: 'http://twitter.com/search?q=',
  OAUTH_REQUEST_TOKEN: 'http://twitter.com/oauth/request_token',
  OAUTH_ACCESS_TOKEN: 'http://twitter.com/oauth/access_token',
  OAUTH_AUTHORIZE: 'http://twitter.com/oauth/authorize?oauth_token='
};
TwitterLib.prototype = {
  username: function() {
    return this.oauthLib.screen_name;
  },
  authenticated: function() {
    return this.oauthLib.authenticated;
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
    var fullUrl = TwitterLib.URLS.BASE + url + ".json";
    var signedParams = this.oauthLib.prepareSignedParams(fullUrl, params, httpMethod);
    var _this = this;
    $.ajax({
      type: httpMethod,
      url: fullUrl,
      data: signedParams,
      dataType: "json",
      timeout: 6000,
      success: function(data, status) {
        _this.normalizeTweets(data);
        callback(true, data, status, context);
      },
      error: function (request, status, error) {
        var fmtError = '"' + error + '"(' + status + ')';
        callback(false, null, fmtError, context);
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

  updateRemainingHits: function() {
    var _this = this;
    this.ajaxRequest("account/rate_limit_status", function(success, data) {
      if(success) {
        _this.remainingHitsCount = data.remaining_hits;
        console.log(_this.remainingHitsCount);
      }
    });
  },

  remainingHits: function() {
    return this.remainingHitsCount;
  },

  tweet: function(callback, msg, replyId) {
    var params = { status: msg };
    if(replyId) {
      params.in_reply_to_status_id = replyId;
    }
    this.ajaxRequest('statuses/update', callback, null, params, "POST");
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
    this.updateRemainingHits();
  }
};


function TwitterOAuth(onAuthenticated) {
  this.user_id = null;
  this.screen_name = null;
  this.authenticated = false;
  this.onAuthenticated = onAuthenticated;
  this.responseCallback = null;
  this.authenticating = false;

  var _this = this;
  chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    _this.authenticating = true;
    var pin = request.cr_oauth_pin;
    if(!sender.tab || !sender.tab.url.match(/twitter\.com\/oauth\/authorize/) || !pin)
      return;
    _this.responseCallback = sendResponse;
    _this.makeRequest.call(_this, TwitterLib.URLS.OAUTH_ACCESS_TOKEN,
      { oauth_verifier: pin }, _this.accessTokenCallback);
  });

  var cachedToken = localStorage.oauth_token_data;
  if(cachedToken) {
    setTimeout(function() {
      _this.accessTokenCallback.call(_this, cachedToken);
    }, 0);
  }
}
TwitterOAuth.prototype = {
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
    var signedParams = this.prepareSignedParams(url, params);
    var _this = this;
    $.ajax({
      type: 'POST',
      url: url,
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
      alert("Ouch... Something bad happened to Chrome Bird while calling Twitter's API.\n\nPlease try clicking the icon again to restart the authentication process.");
      return;
    }
    var paramMap = OAuth.getParameterMap(data);
    this.oauth_token = paramMap['oauth_token'];
    this.oauth_token_secret = paramMap['oauth_token_secret'];

    chrome.tabs.create({
      "url": TwitterLib.URLS.OAUTH_AUTHORIZE + this.oauth_token,
      "selected": true
    });
  },
  getRequestToken: function() {
    this.oauth_token_secret = '';
    this.oauth_token = null;
    this.makeRequest(TwitterLib.URLS.OAUTH_REQUEST_TOKEN, {}, this.requestTokenCallback);
  }
}