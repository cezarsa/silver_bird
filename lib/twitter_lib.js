function TwitterLib(username, password) {
  this.username = username;
  this.password = password;
  this.remainingHitsCount = 150;
  this.updateRemainingHits();
}
TwitterLib.URLS = {
  BASE: 'https://twitter.com/',
  SEARCH: 'http://twitter.com/search?q='
};
TwitterLib.prototype = {
  ajaxRequest: function(url, callback, context, params, httpMethod) {
    if(!httpMethod)
      httpMethod = "GET";
    var _this = this;
    $.ajax({
      type: httpMethod,
      url: TwitterLib.URLS.BASE + url + ".json",
      data: params,
      dataType: "json",
      timeout: 6000,
      beforeSend: function(xhr) {
        var auth = $.base64.encode(_this.username + ":" + _this.password);
        xhr.setRequestHeader("Authorization", "Basic " + auth);
      },
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

  tweet: function(callback, msg) {
    var params = { status: msg };
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