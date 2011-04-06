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
    this.reset();

    currentData[this.orderNumber] = searchQuery;
    this.template.setUserData(currentData);
  },

  /* overridden */
  _doBackendRequest: function(path, callback, context, params) {
    var isUsernameMatchData = this.timelineData.match(/^from:(\w+$)/i);
    if(isUsernameMatchData) {
      params = $.extend({}, params, {
        screen_name: isUsernameMatchData[1]
      });
      this.manager.twitterBackend.usersTimeline(callback, params);
    } else {
      var queryParams = $.extend({}, params, {
        q: this.timelineData
      });
      this.manager.twitterBackend.searchTimeline(callback, context, queryParams);
    }
  }
});