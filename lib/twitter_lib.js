function TwitterLib(username, password) {
  this.username = username;
  this.password = password;
  this.remainingHitsCount = 150;
  this.updateRemainingHits();
}
TwitterLib.URLS = {
  BASE: 'http://twitter.com/',
  SEARCH: 'http://twitter.com/search?q='
}
TwitterLib.prototype = {
  ajaxRequest: function(url, callback, context, params, httpMethod) {
    if(!httpMethod)
      httpMethod = "GET";
    $.ajax({
      type: httpMethod,
      url: TwitterLib.URLS.BASE + url + ".json",
      data: params,
      dataType: "json",
      timeout: 5000,
      username: this.username,
      password: this.password,
      success: function(data, status) {
        callback(true, data, status, context);
      },
      error: function (request, status, error) {
        callback(false, null, status, context);
      }
    });
  },

  updateRemainingHits: function() {
    var _this = this;
    this.ajaxRequest("account/rate_limit_status", function(success, data) {
      if(success)
        _this.remainingHitsCount = data.remaining_hits;
    });
  },

  remainingHits: function() {
    return this.remainingHitsCount;
  },

  tweet: function(callback, msg) {
    var params = { status: msg };
    this.ajaxRequest('statuses/update', callback, null, params, "POST");
  },

  friendsTimeline: function(callback, context, count, page) {
    var params = {};
    if(count)
      params.count = count;
    if(page)
      params.page = page;

    this.ajaxRequest("statuses/friends_timeline", callback, context, params);
    this.updateRemainingHits();
  }
}