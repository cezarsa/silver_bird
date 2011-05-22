function FavoritesTweetsTimeline(timelineId, manager, template) {
  TweetsTimeline.call(this, timelineId, manager, template);
}

$.extend(FavoritesTweetsTimeline.prototype, TweetsTimeline.prototype, {
  pushTweet: function(tweet) {
    var list = this.tweetsCache;
    var baseTime = Date.parse(tweet.created_at);
    var i = 0;
    for(; i < list.length; ++i) {
      var tweetTime = Date.parse(list[i].created_at);
      if(baseTime >= tweetTime) {
        break;
      }
    }
    if(i == list.length || list[i].id != tweet.id) {
      list.splice(i, 0, tweet);
    }
  },

  /* Private Methods */

  /* overridden */
  _makeOldTweetsRequestParams: function() {
    return {
      page: (this.tweetsCache.length / 20) + 1
    };
  },

  /* overridden */
  _makeNewTweetsRequestParams: function() {
    return {};
  },

  /* overridden */
  _syncOldTweets: function(tweets, context) {
    for(var i = 0; i < tweets.length; ++i) {
      this.pushTweet(tweets[i]);
    }
  },

  /* overridden */
  _syncNewTweets: function(tweets, context) {
    var newCount = 0;
    for(var i = 0; i < tweets.length; ++i) {
      var j = 0;
      for(; j < this.tweetsCache.length; ++j) {
        if(tweets[i].id == this.tweetsCache[j].id) {
          break;
        }
      }
      if(j != this.tweetsCache.length) {
        break;
      }
      newCount += 1;
      this.newTweetsCache.push(tweets[i]);
    }
    return newCount;
  }
});