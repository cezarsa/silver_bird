function TweetsTimeline(timelineId, manager, template) {
  this.timelineId = timelineId;
  this.manager = manager;
  this.template = template;

  this.tweetsCache = [];
  this.newTweetsCache = [];
  this.unreadNotified = [];

  this.timerId = null;
  this.currentError = null;
  this.currentCallback = null;
  this.currentScroll = 0;
  this.firstRun = true;
  this.timelinePath = null;
  this.timelineId = timelineId;
  this.timelineStopped = false;
  this.timelinePath = this.template.templatePath;
  this.unifiedRunning = false;
  this.currentRequestId = 0;
  this.canceledRequests = {};

  StreamListener.subscribe(this.onStreamData, this);
}

TweetsTimeline.prototype = {
  init: function() {
    this._baseInit();
  },

  remove: function(){
    this.template.setVisible(false);
    if(!this.template.includeInUnified) {
      this.killTimeline();
      return true;
    }
    return false;
  },

  getError: function() {
    return this.currentError;
  },

  killTimeline: function() {
    StreamListener.unsubscribe(this);
    this.timelineStopped = true;
    this._stopTimer();
  },

  giveMeTweets: function(callback, syncNew, cacheOnly, keepCache, suggestedCount) {
    if(!this.timelinePath) {
      callback([], this.timelineId, this);
      return;
    }
    var _this = this;
    if(this.unifiedRunning) {
      this._cancelRequest();
    }
    if(this.currentCallback) {
      if(this.unifiedRunning) {
        try {
          this.currentCallback([], this.timelineId, this);
        } catch(e) {
          /* ignoring */
        } finally {
          this.currentCallback = null;
        }
      } else {
        //Handling multiple calls to giveMeTweets, just update the registered
        //callback and let the first request finish.
        this.currentCallback = callback;
        return;
      }
    }
    if(syncNew) {
      //We should fetch new tweets, update the cache and then return the
      //cached results.
      var oldNewTweetsCallback = this.manager.newTweetsCallback;
      this.currentCallback = callback;
      this.manager.newTweetsCallback = null;
      var onFinishCallback = function() {
        var tweetsCallback = _this.currentCallback;
        _this.currentCallback = null;

        _this.updateNewTweets();
        _this.manager.updateAlert();
        _this.giveMeTweets(tweetsCallback, false, true);
        _this.manager.newTweetsCallback = oldNewTweetsCallback;
      };
      this._fetchNewTweets(onFinishCallback);
      return;
    }
    if(cacheOnly && !this.firstRun) {
      //Only return cached results if this is not the first run.
      if(!keepCache) {
        this._cleanUpCache();
      }
      try {
        callback(this.tweetsCache, this.timelineId, this);
      } catch(e) {
        /* ignoring exception, popup might be closed */
      }
      return;
    }
    //If we didn't return yet it's because we want to fetch old tweets
    //from twitter's API.

    this.currentCallback = callback;
    var params = this._makeOldTweetsRequestParams(suggestedCount);
    var context = {
      usingMaxId: !!params.max_id,
      requestId: this._nextRequestId()
    };
    this._doBackendRequest(this.timelinePath, function(success, tweets, status, context) {
      _this._onFetch(success, _this._filterBlockedTweets(tweets), status, context);
    }, context, params);
  },

  updateNewTweets: function() {
    this.tweetsCache = this.newTweetsCache.concat(this.tweetsCache);
    this.newTweetsCache = [];
    this.unreadNotified = [];
  },

  newTweetsCount: function() {
    var unreadCount = 0;
    for(var i = this.newTweetsCache.length - 1; i >= 0; --i) {
      if(!this.manager.isTweetRead(this.newTweetsCache[i].id)) {
        ++unreadCount;
      }
    }
    return [this.newTweetsCache.length, unreadCount];
  },

  getNewUnreadTweets: function() {
    var unreadNewList = [];
    for(var i = 0; i < this.newTweetsCache.length; ++i) {
      var tweet = this.newTweetsCache[i];
      if(!this.manager.isTweetRead(tweet.id) && !this.unreadNotified[tweet.id] && tweet.user.screen_name != TweetManager.instance.twitterBackend.oauthLib.screen_name) {
        unreadNewList.push(tweet);
        this.unreadNotified[tweet.id] = true;
      }
    }
    return unreadNewList;
  },

  getNewUnreadIds: function() {
    var unreadNewIds = [];
    for(var i = 0; i < this.newTweetsCache.length; ++i) {
      var tweet = this.newTweetsCache[i];
      if(!this.manager.isTweetRead(tweet.id) && tweet.user.screen_name != TweetManager.instance.twitterBackend.oauthLib.screen_name) {
        unreadNewIds.push(tweet.id);
      }
    }
    return unreadNewIds;
  },

  removeFromCache: function(id) {
    var i = 0;
    for(; i < this.tweetsCache.length; ++i) {
      if(this.tweetsCache[i].id == id)
        break;
    }
    if(i != this.tweetsCache.length) {
      this.tweetsCache.splice(i, 1);
    }
  },

  findTweet: function(id) {
    var i = 0;
    for(; i < this.tweetsCache.length; ++i) {
      if(this.tweetsCache[i].id == id)
        return this.tweetsCache[i];
    }
    return null;
  },

  getNewTweetsCache: function() {
    return this.newTweetsCache;
  },

  getTweetsCache: function() {
    return this.tweetsCache;
  },

  reset: function() {
    this.tweetsCache = [];
    this.newTweetsCache = [];
    this.unreadNotified = [];
    this.firstRun = true;
    this._stopTimer();
  },

  onStreamData: function(data) {
    if(data.event && data.event == StreamListener.events.DISCONNECTED) {
      this.shouldListenStream = false;
      if(this.listeningStream) {
        this.listeningStream = false;
        this._fetchNewTweets();
      }
    }
    if(this.shouldListenStream) {
      if(!this.listeningStream) {
        return;
      }
      this._handleStreamData(data);
    } else {
      this.shouldListenStream = this._shouldListenStream();
    }
  },

  /* Private Methods */

  _shouldListenStream: function() {
    return this.template.id == TimelineTemplate.HOME ||
      this.template.id == TimelineTemplate.MENTIONS ||
      this.template.id == TimelineTemplate.SENT_DMS ||
      this.template.id == TimelineTemplate.RECEIVED_DMS;
  },

  _handleStreamData: function(data) {
    var tweets;
    if(data.text) {
      var mentionStr = '@' + this.manager.twitterBackend.username();
      if(data.text.match(mentionStr)) {
        if(this.template.id == TimelineTemplate.MENTIONS) {
          tweets = [data];
        }
      } else if(this.template.id == TimelineTemplate.HOME) {
        tweets = [data];
      }
    } else if(data.direct_message) {
      if(data.direct_message.user.screen_name == this.manager.twitterBackend.username()) {
        if(this.template.id == TimelineTemplate.SENT_DMS) {
          tweets = [data.direct_message];
        }
      } else {
        if(this.template.id == TimelineTemplate.RECEIVED_DMS) {
          tweets = [data.direct_message];
        }
      }
    }

    if(tweets) {
      this._syncNewTweets(tweets, {});
      this.manager.notifyNewTweets();
    }
  },

  _setError: function(status) {
    this.currentError = status;
  },

  _setTimelinePath: function(path) {
    this.timelinePath = path;
  },

  _stopTimer: function() {
    if(this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  },

  _onFetchNew: function(success, tweets, status, context) {
    if(this.timelineStopped) {
      return;
    }
    var _this = this;
    if(this._isRequestCanceled(context.requestId)) {
      this.timerId = setTimeout(function() { _this._fetchNewTweets(); }, this.template.refreshInterval);
      return;
    }
    if(!success) {
      this._setError(status);
      if(context.onFinish)
        context.onFinish(0);
      this.timerId = setTimeout(function() { _this._fetchNewTweets(); }, this.template.refreshInterval);
      return;
    }
    this._setError(null);

    this._syncNewTweets(tweets, context);

    if(tweets.length > 0) {
      this.manager.notifyNewTweets();
    }
    if(context.onFinish) {
      context.onFinish(tweets.length);
    }
    if(this.shouldListenStream) {
      this.timerId = null;
      this.listeningStream = true;
    } else {
      this.timerId = setTimeout(function() { _this._fetchNewTweets(); }, this.template.refreshInterval);
    }
  },

  _doBackendRequest: function(path, callback, context, params) {
    this.manager.twitterBackend.timeline(path, callback, context, params);
  },

  _fetchNewTweets: function(onFinishCallback) {
    this._stopTimer();
    var _this = this;
    if(this.manager.suspend && !onFinishCallback) {
      this.timerId = setTimeout(function() { _this._fetchNewTweets(); }, this.template.refreshInterval);
      return;
    }
    var context = {
      requestId: this._nextRequestId(),
      onFinish: onFinishCallback
    };
    var params = this._makeNewTweetsRequestParams();
    this._doBackendRequest(this.timelinePath, function(success, tweets, status, context) {
      _this._onFetchNew(success, _this._filterBlockedTweets(tweets), status, context);
    }, context, params);
  },

  _onFetch: function(success, tweets, status, context) {
    if(this.timelineStopped || this._isRequestCanceled(context.requestId)) {
      return;
    }
    if(!success) {
      this._setError(status);
      try {
        this.currentCallback(null, this.timelineId, this);
      } catch(e) {
        /* ignoring exception, popup might be closed */
      }

      this._setError(null);
      this.currentCallback = null;
      return;
    }
    this._setError(null);
    this._syncOldTweets(tweets, context);

    // Let's clean this.currentCallback before calling it as
    // there might be unexpected errors and this should not block
    // the extension.
    var callback = this.currentCallback;
    this.currentCallback = null;
    try {
      callback(this.tweetsCache, this.timelineId, this);
    } catch(e) {
      /* ignoring exception, popup might be closed */
    }

    if(this.firstRun) {
      this.firstRun = false;
      var _this = this;
      this.timerId = setTimeout(function() { _this._fetchNewTweets(); }, this.template.refreshInterval);
    }
  },

  _cleanUpCache: function() {
    if(this.currentScroll !== 0) {
      return;
    }
    var len = this.tweetsCache.length;
    if(len <= OptionsBackend.get('max_cached_tweets'))
      return;
    this.tweetsCache = this.tweetsCache.slice(0, OptionsBackend.get('max_cached_tweets') + 1);
  },

  _makeOldTweetsRequestParams: function(suggestedCount) {
    if(!suggestedCount) {
      suggestedCount = OptionsBackend.get('tweets_per_page');
    }
    var params = {count: suggestedCount, per_page: suggestedCount};
    var maxId = null;
    if(this.tweetsCache.length > 0) {
      maxId = this.tweetsCache[this.tweetsCache.length - 1].id;
    }
    if(maxId) {
      params.max_id = maxId;
    }
    return params;
  },

  _makeNewTweetsRequestParams: function() {
    var lastId = null;
    if(this.newTweetsCache.length > 0) {
      lastId = this.newTweetsCache[0].id;
    } else if(this.tweetsCache.length > 0) {
      lastId = this.tweetsCache[0].id;
    }
    var params = {count: 200};
    if(lastId) {
      params.since_id = lastId;
    }
    return params;
  },

  _syncOldTweets: function(tweets, context) {
    var tweetsCacheLastId = (this.tweetsCache.length > 0) ? this.tweetsCache[this.tweetsCache.length - 1].id : -1;
    for(var i = 0; i < tweets.length; ++i) {
      if(tweets[i].id == tweetsCacheLastId) {
        continue;
      }
      this.tweetsCache.push(tweets[i]);
    }
  },

  _syncNewTweets: function(tweets, context) {
    for(var i = tweets.length - 1; i >= 0; --i) {
      this.newTweetsCache.unshift(tweets[i]);
      var tid = tweets[i].id;
      if(context.onFinish) {
        this.manager.readTweet(tid);
      } else if(!this.manager.readTweets[tid]) {
        this.manager.unreadTweets[tid] = true;
      }
    }
  },

  /**
  * Filter-out all tweets and retweets that contain a status.user.id,
  * or status.retweeted_status.user.id in this.manager.blockedUserIds,
  * or that contain a status.user.name in this.manager.blockedUserNames.
  * User names must be checked as user_ids from the Twitter search API do
  * not match those from the main Twitter API.
  *
  * @param json tweets - response as returned by a Twitter timeline REST method
  * @return json
  */
  _filterBlockedTweets: function(tweets) {
    var filteredTweets = [];
    for(var i in tweets) {
      if(!(tweets[i].user && tweets[i].user.id in this.manager.blockedUserIds 
           || tweets[i].user && this.manager.blockedUserNames.indexOf(tweets[i].user.name) >= 0
           || tweets[i].retweeted_status && tweets[i].retweeted_status.user.id in this.manager.blockedUserIds)) {
        filteredTweets.push(tweets[i]);
      }
    }
    return filteredTweets;
  },

  _baseInitTimeout: 1000,
  _baseInit: function() {
    var _this = this;
    this.giveMeTweets(function(success) {
      if(!success) {
        setTimeout(function() {
          if(_this.firstRun && !_this.timelineStopped && !_this.currentCallback) {
            _this._baseInit();
          }
        }, _this._baseInitTimeout);
        if(_this._baseInitTimeout < (5 * 60 * 1000)) {
          _this._baseInitTimeout = _this._baseInitTimeout * 2;
        }
      } else {
        _this._baseInitTimeout = 1000;
      }
    });
  },

  _cancelRequest: function() {
    this.canceledRequests[this.currentRequestId] = true;
  },

  _nextRequestId: function() {
    this.currentRequestId += 1;
    return this.currentRequestId;
  },

  _isRequestCanceled: function(requestId) {
    var isCanceled = requestId in this.canceledRequests;
    delete this.canceledRequests[requestId];
    return isCanceled;
  }
};
