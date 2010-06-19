function SearchTweetsTimeline(timelineId, manager, template, searchQuery, orderNumber) {
  MultipleTweetsTimeline.call(this, timelineId, manager, template, searchQuery, orderNumber);
}

$.extend(SearchTweetsTimeline.prototype, MultipleTweetsTimeline.prototype, {
  changeSearchQuery: function(searchQuery) {
    if(searchQuery == this.timelineData) {
      return false;
    }
    this._changeData(searchQuery);
    return true;
  },

  getSearchQuery: function() {
    return this.timelineData;
  },

  /* overridden */
  _changeData: function(searchQuery) {
    var currentData = this.template.getUserData();
    if(!currentData) {
      currentData = [];
    }

    this.timelinePath = this.timelineData = searchQuery;
    this.tweetsCache = [];
    this.newTweetsCache = [];
    this.unreadNotified = [];
    this.firstRun = true;
    this._stopTimer();

    currentData[this.orderNumber] = searchQuery;
    this.template.setUserData(currentData);
  },

  /* overridden */
  _doBackendRequest: function(path, callback, context, params) {
    var queryParams = $.extend({}, params, {
      q: this.timelineData
    });
    this.manager.twitterBackend.searchTimeline(callback, context, queryParams);
  }
});