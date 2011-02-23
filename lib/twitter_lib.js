function TwitterLib(onAuthenticated, onHitsUpdated, microbloggingService, baseUrl, baseOauthUrl, baseSigningUrl, baseOauthSigningUrl, baseSearchUrl, oauthTokenData) {
  this.remainingHitsCount = 150;
  this.nextHitsReset = 0;
  this.onAuthenticated = onAuthenticated;
  this.onHitsUpdated = onHitsUpdated;
  this.hourlyLimit = 150;
  this.microbloggingService = microbloggingService;
  var _this = this;
  this.oauthLib = new TwitterOAuth(microbloggingService, oauthTokenData, function() {
    _this.updateHourlyHitsLimit.call(_this);
    if(!_this.username()) {
      _this.verifyCredentials(function() {
        _this.onAuthenticated();
        _this.connectStream();
      });
    } else {
      _this.onAuthenticated();
      _this.connectStream();
    }
  });

  if(!baseUrl.match(/\/$/)) {
    baseUrl = baseUrl + '/';
  }
  TwitterLib.URLS = {
    BASE: baseUrl,
    BASE_OAUTH: baseOauthUrl,
    BASE_SIGNING: baseSigningUrl,
    BASE_OAUTH_SIGNING: baseOauthSigningUrl,
    BASE_SEARCH: baseSearchUrl
  };
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

  streamReconnectCount: 0,
  streamReconnectBaseTime: 20000,
  streamReconnectWaitTime: this.streamReconnectBaseTime,
  streamMaxStaleTime: 90000,
  streamMaxReconnectWait: 240000,

  connectStream: function() {
    if(!OptionsBackend.get('use_streaming_api')) {
      return;
    }
    var MAX_BUFFER = 1024 * 500;

    var url = OptionsBackend.get('user_stream_url');
    var params = {
      delimited: 'length'
    };

    this.streamReconnectCount += 1;
    console.log('connecting to stream ', this.streamReconnectCount);

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url + '?' + $.param(params), true);
    xhr.setRequestHeader('X-User-Agent', 'Chromed Bird ' + JSON.parse(Persistence.version().val()).join('.'));
    this.signOauth(xhr, url, params, 'GET');

    var _this = this;
    var lastLoaded = 0, lastChunkLen, lastProgressTime = new Date().getTime();
    var onProgress = function(e) {
      console.log('loaded', e.loaded, 'time', new Date().getTime() - lastProgressTime);
      lastProgressTime = new Date().getTime();

      var totalLen = e.loaded;
      if(totalLen > MAX_BUFFER) {
        console.log('stream disconnected, buffer too large');
        xhr.removeEventListener("progress", onProgress, false);
        xhr.abort();
      }
      var data = xhr.responseText;

      while(lastLoaded < totalLen) {
        if(!lastChunkLen) {
          lastChunkLen = '';
          var curChar = data.charAt(lastLoaded);
          while(curChar != '\n' || lastChunkLen.length === 0) {
            if(curChar.match(/\d/)) {
              lastChunkLen += curChar;
            }
            lastLoaded += 1;
            if(lastLoaded >= totalLen) {
              return;
            }
            curChar = data.charAt(lastLoaded);
          }
          lastLoaded += 1;
          lastChunkLen = parseInt(lastChunkLen, 10);
        }
        if(lastLoaded + lastChunkLen > totalLen) {
          // Let's just wait for the rest of our data
          return;
        }
        var jsonChunk = data.substring(lastLoaded, lastLoaded + lastChunkLen);
        var parsedChunk = JSON.parse(jsonChunk);
        // TODO: Send parsed json message
        console.log('streamed data', parsedChunk);
        lastLoaded += lastChunkLen;
        lastChunkLen = null;
      }
    };

    xhr.addEventListener("progress", onProgress, false);
    var intervalHandle;
    xhr.onreadystatechange = function() {
      if(xhr.readyState == 2 && xhr.status == 200) {
        console.log('stream connected ok');

        var checkStaleConnection = function() {
          var time = new Date().getTime();
          if(time - lastProgressTime > _this.streamMaxStaleTime) {
            console.log('stream stale connection');
            xhr.removeEventListener("progress", onProgress, false);
            xhr.abort();
          }
        };
        intervalHandle = setInterval(checkStaleConnection, _this.streamMaxStaleTime / 2);

        _this.streamReconnectWaitTime = _this.streamReconnectBaseTime;
      } else if(xhr.readyState == 4) {
        // TODO: Broadcast disconnection notice
        console.log('stream disconnected', xhr.status, xhr.statusText);
        if(intervalHandle) {
          clearInterval(intervalHandle);
          intervalHandle = null;
        }
        setTimeout(function() {
          _this.connectStream();
        }, _this.streamReconnectWaitTime);
        if(_this.streamReconnectWaitTime < _this.streamMaxReconnectWait) {
          _this.streamReconnectWaitTime *= 2;
        }
      }
    };

    xhr.send();
  },

  generateOauthHeader: function(signedData, includeRealm) {
    var authorization = 'OAuth ';
    if(includeRealm) {
      authorization += 'realm="http://api.twitter.com/", ';
    }
    authorization += 'oauth_consumer_key="' + signedData.oauth_consumer_key + '", ' +
    'oauth_signature_method="HMAC-SHA1", ' +
    'oauth_token="' + signedData.oauth_token + '", ' +
    'oauth_timestamp="' + signedData.oauth_timestamp + '", ' +
    'oauth_nonce="' + encodeURIComponent(signedData.oauth_nonce) + '", ' +
    'oauth_version="1.0", ' +
    'oauth_signature="' + encodeURIComponent(signedData.oauth_signature) + '"';

    return authorization;
  },
  signOauthEcho: function(xhr, url) {
    var signedData = this.oauthLib.prepareSignedParams(url, {}, 'GET');

    xhr.setRequestHeader('X-Auth-Service-Provider', url);
    xhr.setRequestHeader('X-Verify-Credentials-Authorization', this.generateOauthHeader(signedData, true));
  },
  signOauth: function(xhr, url, params, method) {
    var signedData = this.oauthLib.prepareSignedParams(url, params, method);

    xhr.setRequestHeader('Authorization', this.generateOauthHeader(signedData));
  },
  ajaxRequest: function(url, callback, context, requestParams, httpMethod, useSearchAPI, overriddenTimeout) {
    if(!httpMethod) {
      httpMethod = "GET";
    }
    if(!requestParams) {
      requestParams = {};
    }
    var requestUrl;
    if(useSearchAPI) {
      requestUrl = TwitterLib.URLS.BASE_SEARCH + ".json";
    } else {
      requestUrl = TwitterLib.URLS.BASE + url + ".json";
    }
    var _this = this;
    var beforeSendCallback = function(request, settings) {
      if(!useSearchAPI) {
        var signingUrl = TwitterLib.URLS.BASE_SIGNING + url + ".json";
        _this.signOauth(request, signingUrl, requestParams, httpMethod);
      }
    };
    var errorCallback = function (request, status, error) {
      console.warn("Failed Request", requestUrl + '?' + $.param(requestParams), request, status, error);
      var fmtError;
      if(status == 'timeout') {
        fmtError = "(timeout)";
      } else {
        try {
          if(request && request.readyState == 4 && request.status == 401) {
            if(_this.oauthLib.adjustTimestamp(request, 'Date')) {
              console.log('Unauthorized, trying again using adjusted timestamp based on server time.');
              _this.ajaxRequest(url, callback, context, requestParams, httpMethod, useSearchAPI, overriddenTimeout);
              return;
            } else {
              //TODO: Logout
            }
          }
        } catch(e) {
          /* Ignoring */
        }
      }
      if(!fmtError) {
        try {
          if(!request.responseText) {
            throw 'no response';
          }
          if(_this.microbloggingService == 'identica') {
            var txt = request.responseText;
            fmtError = '"' + txt.replace(/<.*>(.*)<.*>/, '$1') + '"';
          } else {
            var rspObj = JSON.parse(request.responseText);
            fmtError = '"' + rspObj.error + '"(' + request.statusText + ')';
          }
        } catch(e) {
          fmtError = '"' + error + '"(' + status + ')';
        }
      }
      callback(false, null, fmtError, context);
    };
    var successCallback = function(data, status, request) {
      if(request.status === 0) {
        // Empty responses are a pain...
        errorCallback(request, 'error', 'empty response');
        return;
      }
      if(!data) {
        data = [];
      } else if(useSearchAPI) {
        if(data) {
          data = data.results;
        }
        if(!data) {
          data = [];
        }
      }
      _this.normalizeTweets(data);
      callback(true, data, status, context);
    };
    $.ajax({
      type: httpMethod,
      url: requestUrl,
      data: requestParams,
      dataType: "json",
      timeout: overriddenTimeout,
      success: successCallback,
      error: errorCallback,
      beforeSend: beforeSendCallback,
      complete: function(request) {
        if(!request) return;
        try {
          var remaining = request.getResponseHeader("X-RateLimit-Remaining");
          if(remaining) {
            _this.remainingHitsCount = remaining;
            _this.nextHitsReset = request.getResponseHeader("X-RateLimit-Reset");
            _this.hourlyLimit = request.getResponseHeader("X-RateLimit-Limit");

            _this.onHitsUpdated(_this.remainingHitsCount, _this.nextHitsReset, _this.hourlyLimit);
          }
        } catch(e) { /* ignoring */ }
      }
    });
  },

  normalizeTweets: function(tweetsOrTweet) {
    if(tweetsOrTweet.hasOwnProperty('id_str')) {
      tweetsOrTweet = [tweetsOrTweet];
    }
    for(var i = 0, len = tweetsOrTweet.length; i < len; ++i) {
      var ti = tweetsOrTweet[i];

      // Damn Snowflake... Damn 53 bits precision limit...
      if(ti.id_str) {
        ti.id = ti.id_str;
      }
      if(ti.in_reply_to_status_id_str) {
        ti.in_reply_to_status_id = ti.in_reply_to_status_id_str;
      }
      if(ti.in_reply_to_user_id_str) {
        ti.in_reply_to_user_id = ti.in_reply_to_user_id_str;
      }
      if(ti.current_user_retweet_id_str) {
        ti.current_user_retweet_id = ti.current_user_retweet_id_str;
      }

      if(!ti.user) {
        // DMs
        ti.user = ti.sender;
      }
      if(!ti.user) {
        // Search result
        ti.user = {
          name: ti.from_user,
          screen_name: ti.from_user,
          profile_image_url: ti.profile_image_url
        };
      }
    }
  },

  verifyCredentials: function(callback) {
    var _this = this;
    this.ajaxRequest("account/verify_credentials", function(success, data) {
      if(success) {
        _this.oauthLib.screen_name = data.screen_name;
      }
      if(callback) {
        callback(success, data);
      }
    });
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

  showTweet: function(callback, id) {
    this.ajaxRequest('statuses/show/' + id, callback, null, null, "GET", false);
  },

  tweet: function(callback, msg, replyId) {
    var params = { status: msg };
    if(replyId) {
      params.in_reply_to_status_id = replyId;
    }
    this.ajaxRequest('statuses/update', callback, null, params, "POST", false, 30000);
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

  subs: function(callback) {
    this.ajaxRequest(this.username() + '/lists/subscriptions', callback, null, null, "GET");
  },

  timeline: function(timeline_path, callback, context, params) {
    this.ajaxRequest(timeline_path, callback, context, params);
  },

  searchTimeline: function(callback, context, params) {
    params['result_type'] = 'recent';
    this.ajaxRequest('', callback, context, params, "GET", true);
  },

  blockedUserIds: function(callback) {
    this.ajaxRequest('blocks/blocking/ids', callback, null, null, "GET");
  },

  friendsIds: function(callback) {
    var params = {
      cursor: -1
    };
    this.ajaxRequest('friends/ids/' + this.username(), callback, null, params, "GET");
  },
  
  trendingTopics: function(callback, param) {
    var request = 'trends';
    if (param != undefined) {
      request += '/' + param;
    } else {
      request += '/1'; //1 - worldwide
    }
    this.ajaxRequest(request, callback, null, null, "GET");
  },

  lookupUsers: function(callback, usersIdList) {
    var params = {
      user_id: usersIdList.join(',')
    };
    this.ajaxRequest('users/lookup', callback, null, params, "GET");
  },

  usersTimeline: function(callback, params) {
    this.ajaxRequest('statuses/user_timeline', callback, {}, params);
  },

  follow: function(callback, username) {
    var params = {
      screen_name: username,
      follow: false
    };
    this.ajaxRequest('friendships/create', callback, null, params, "POST");
  },

  unfollow: function(callback, username) {
    var params = {
      screen_name: username
    };
    this.ajaxRequest('friendships/destroy', callback, null, params, "POST");
  }
};

var globalOAuthInstance;
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  if(!globalOAuthInstance)
    return;
  if(request.identica_request_token) {
    if(!globalOAuthInstance.authenticated && globalOAuthInstance.tokenRequested) {
      if(globalOAuthInstance.oauth_token == request.identica_request_token) {
        globalOAuthInstance.authenticating = true;
        globalOAuthInstance.getAccessToken.call(globalOAuthInstance, '', function() {
          chrome.tabs.remove(sender.tab.id);
        });
      }
    }
  }
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

function TwitterOAuth(microbloggingService, oauthTokenData, onAuthenticated) {
  this.user_id = null;
  this.screen_name = null;
  this.authenticated = false;
  this.onAuthenticated = onAuthenticated;
  this.responseCallback = null;
  this.authenticating = false;
  this.tokenRequested = false;
  this.timeAdjusted = false;
  this.oauthTokenData = oauthTokenData;
  this.microbloggingService = microbloggingService;

  if(microbloggingService == 'twitter') {
    this.consumerSecret = 'MsuvABdvwSn2ezvdQzN4uiRR44JK8jESTIJ1hrhe0U';
    this.consumerKey    = 'KkrTiBu0hEMJ9dqS3YCxw';
  } else if(microbloggingService == 'identica') {
    this.consumerSecret = '5160eba9484e97fa164acd7fd5aa9b83';
    this.consumerKey    = '4f7780c1329c67a3d69c84c11a4edf9d';
  }

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
      consumerSecret: this.consumerSecret,
      tokenSecret: this.oauth_token_secret
    };
    if(!httpMethod)
      httpMethod = 'POST';
    var message = {
      action: url,
      method: httpMethod,
      parameters: [
        ['oauth_consumer_key', this.consumerKey],
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
  adjustTimestamp: function(request) {
    var serverHeaderFields = ['Last-Modified', 'Date'];
    var serverTimestamp;
    for(var i = 0, len = serverHeaderFields.length; i < len; ++i) {
      var headerField = serverHeaderFields[i];
      var fieldValue = request.getResponseHeader(headerField);
      if(!fieldValue) {
        continue;
      }
      serverTimestamp = Date.parse(fieldValue);
      if(serverTimestamp && !isNaN(serverTimestamp)) {
        break;
      }
    }
    if(serverTimestamp) {
      var beforeAdj = OAuth.timeCorrectionMsec;
      OAuth.timeCorrectionMsec = serverTimestamp - (new Date()).getTime();
      if(Math.abs(beforeAdj - OAuth.timeCorrectionMsec) > 5000) {
        console.log("Server timestamp: " + serverTimestamp + " Correction (ms): " + OAuth.timeCorrectionMsec);
        return true;
      }
    }
    return false;
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
      success: function(data, status) {
        callback.call(_this, data);
      },
      error: function (request, status, error) {
        var fmtError = '';
        try {
          if(_this.adjustTimestamp(request)) {
            console.log('First OAuth token request failed: ' + status + '. Trying again using adjusted timestamp.');
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
};
