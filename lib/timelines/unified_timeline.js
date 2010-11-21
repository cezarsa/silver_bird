function UnifiedTweetsTimeline(timelineId, manager, template, timelines) {
  TweetsTimeline.call(this, timelineId, manager, template);
  this.timelines = timelines;
  this.currentPage = 0;
}

$.extend(UnifiedTweetsTimeline.prototype, TweetsTimeline.prototype, {
  /* overridden */
  init: function() {
    TimelineTemplate.reloadOptions();
    var _this = this;
    TimelineTemplate.eachTimelineTemplate(function(template) {
      if(_this._shouldIncludeTemplate(template)) {
        TweetManager.instance.createTimelineTemplate(template, true);
      }
    }, true);
  },

  /* overridden */
  remove: function() {
    this.template.setVisible(false);
    if(!this.template.includeInUnified) {
      this.killTimeline();
      this._eachTimeline(function(timeline) {
        if(!timeline.template.visible) {
          var timelineId = timeline.timelineId;
          timeline.killTimeline();
          delete this.timelines[timelineId];
        }
      });
      TimelineTemplate.reloadOptions();
      return true;
    }
    return false;
  },

  /* overridden */
  getError: function() {
    var err = null;
    this._eachTimeline(function(timeline) {
      if(timeline.getError()) {
        err = timeline.getError();
        return false;
      }
    });
    return err;
  },

  /* overridden */
  killTimeline: function() {
    /* noop */
  },

  /* overridden */
  giveMeTweets: function(callback, syncNew, cacheOnly) {
    if(this.currentCallback) {
      //Handling multiple calls to giveMeTweets, just update the registered
      //callback and let the first request finish.
      this.currentCallback = callback;
      return;
    }
    this.currentCallback = callback;

    var tweetsPerPage = OptionsBackend.get('tweets_per_page');
    var maxCachedTweets = OptionsBackend.get('max_cached_tweets');
    var maxCachedPages = parseInt((maxCachedTweets / tweetsPerPage) - 1, 10);

    if(cacheOnly || syncNew) {
      if(this.currentScroll === 0) {
        if(this.currentPage > maxCachedPages) {
          this.currentPage = maxCachedPages;
          this._eachTimeline(function(timeline) {
            timeline._cleanUpCache();
          });
        }
      }
    } else {
      this.currentPage += 1;
    }

    var _this = this;
    var errorAbort = false;
    var externalTweetsCache = {};
    var requiredTweets = (this.currentPage + 1) * tweetsPerPage;

    var resultTweetsList = [];
    var usedTweetsMap = {};

    var findMaxBefore = function(maxDate) {
      var maxBeforeDate = null;
      var maxBeforeTweet = null;

      var checkMaxTweet = function(timelineId) {
        var tweetsInTimeline = externalTweetsCache[timelineId];
        for(var i = 0, len = tweetsInTimeline.length; i < len; ++i) {
          var tweet = tweetsInTimeline[i];
          if(usedTweetsMap[tweet.id]) {
            continue;
          }
          var date = Date.parse(tweet.created_at);
          if(maxDate && date > maxDate) {
            continue;
          }
          if(!maxBeforeDate || date > maxBeforeDate) {
            maxBeforeDate = date;
            maxBeforeTweet = tweet;
            maxBeforeTweet.timelineId = timelineId;
            if(!maxBeforeTweet.originalTimelineId) {
              maxBeforeTweet.originalTimelineId = timelineId;
            }
          }
        }
      };
      var checkFavorite = false;
      for(var timelineId in externalTweetsCache) {
        if(timelineId == 'favorites') {
          //HACK: postpone
          checkFavorite = true;
          continue;
        }
        checkMaxTweet(timelineId);
      }
      if(checkFavorite) {
        checkMaxTweet('favorites');
      }

      if(maxBeforeTweet) {
        usedTweetsMap[maxBeforeTweet.id] = true;
      }
      return maxBeforeTweet;
    };

    var joinFunction = function() {
      if(errorAbort) {
        return;
      }
      /* 2nd step: Let's cherry pick tweets until we get enough of them
         to compose our unified timeline.
      */
      while(resultTweetsList.length < requiredTweets) {
        var lastTweet = resultTweetsList[resultTweetsList.length - 1];
        var maxDate = null;
        if(lastTweet) {
          maxDate = Date.parse(lastTweet.created_at);
        }
        var nextTweet = findMaxBefore(maxDate);
        if(!nextTweet) {
          break;
        }
        resultTweetsList.push(nextTweet);
        if(resultTweetsList.length == requiredTweets) {
          break;
        }
        var timelineTweetsCache = externalTweetsCache[nextTweet.timelineId];
        var isLastInTimelineCache = timelineTweetsCache[timelineTweetsCache.length - 1].id == nextTweet.id;
        if(isLastInTimelineCache) {
          /* 3rd step: Some timeline went empty because all other tweets are already in
             the unified timeline, now we need to get more tweets from this timeline.
          */
          var newJoinableCallback = Utils.makeJoinableCallback(1, eachFunction, joinFunction);
          var wantedTimeline = _this.timelines[nextTweet.timelineId];
          wantedTimeline.unifiedRunning = true;
          var requiredCount = (requiredTweets - resultTweetsList.length) + 1;
          if(requiredCount <= 2) {
            requiredCount += 1;
          }
          wantedTimeline.giveMeTweets(newJoinableCallback, false, false, true, requiredCount);
          return;
        }
      }
      /* 4th step now we're ready to return our unified timeline. */
      var callback = _this.currentCallback;
      _this.currentCallback = null;
      _this.tweetsCache = resultTweetsList;
      try {
        callback(resultTweetsList, _this.timelineId);
      } catch(e) {
        /* ignoring, popup dead? */
      }
    };
    var eachFunction = function (tweets, timelineId, timelineObj) {
      if(timelineObj) {
        timelineObj.unifiedRunning = false;
      }
      if(errorAbort) {
        return;
      }
      if(!tweets) {
        errorAbort = true;
        try {
          _this.currentCallback(null, _this.timelineId);
        } catch(e) {
          /* ignoring, popup dead? */
        }
        _this.currentCallback = null;
        return;
      }
      var currentTweets = externalTweetsCache[timelineId];
      externalTweetsCache[timelineId] = tweets;
    };

    /* 1st step: Let's get cached results from each timeline and call
       joinFunction when we get all the results.
    */
    var joinCount = this._countTimelines();
    var joinableCallback = Utils.makeJoinableCallback(joinCount, eachFunction, joinFunction);

    this._eachTimeline(function(timeline) {
      timeline.unifiedRunning = true;
      timeline.giveMeTweets(joinableCallback, syncNew, true, true);
    });

  },

  /* overridden */
  updateNewTweets: function() {
    this._eachTimeline(function(timeline) {
      timeline.updateNewTweets();
    });
  },

  /* overridden */
  newTweetsCount: function() {
    var ret = [0, 0];
    this._eachTimeline(function(timeline) {
      var timelineCount = timeline.newTweetsCount();
      ret[0] += timelineCount[0];
      ret[1] += timelineCount[1];
    });
    return ret;
  },

  /* overridden */
  getNewUnreadTweets: function() {
    return [];
  },

  /* overridden */
  getNewUnreadIds: function() {
    return [];
  },

  /* overridden */
  removeFromCache: function(id) {
    this._eachTimeline(function(timeline) {
      timeline.removeFromCache(id);
    });
  },

  /* overridden */
  findTweet: function(id) {
    return null;
  },

  /* Private Methods */

  _eachTimeline: function(callback) {
    for(var tId in this.timelines) {
      var timeline = this.timelines[tId];
      if(this._shouldIncludeTemplate(timeline.template)) {
        if(callback.call(this, timeline) === false)
          break;
      }
    }
  },

  _countTimelines: function() {
    var count = 0;
    this._eachTimeline(function(timeline) {
      if(this._shouldIncludeTemplate(timeline.template)) {
        ++count;
      }
    });
    return count;
  },

  _shouldIncludeTemplate: function(template) {
    return template.includeInUnified && !template.hiddenTemplate;
  }
});

Utils = {
  makeJoinableCallback: function(joinCount, eachCallback, joinCallback) {
    return function() {
      joinCount--;
      eachCallback.apply(this, arguments);
      if(joinCount === 0) {
        joinCallback();
      }
    };
  }
};