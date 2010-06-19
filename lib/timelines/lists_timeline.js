function ListsTweetsTimeline(timelineId, manager, template, listId, orderNumber) {
  MultipleTweetsTimeline.call(this, timelineId, manager, template, listId, orderNumber);
}

$.extend(ListsTweetsTimeline.prototype, MultipleTweetsTimeline.prototype, {
  changeList: function(listId) {
    this._changeData(listId);
  },

  getListId: function() {
    return this.timelineData;
  },

  /* overridden */
  _setError: function(status) {
    this.currentError = status;
    if(status && status.indexOf('Not Found') != -1) {
      this._changeData(null);
    }
  },

  /* overridden */
  _changeData: function(listId) {
    var currentLists = this.template.getUserData();
    if(!currentLists) {
      currentLists = [];
    }

    if(listId) {
      var u = listId.split("/");
      if(u.length < 3) {
        // Backward compatibility with previous listId format
        u = [null, this.manager.twitterBackend.username(), listId];
        listId = '/' + this.manager.twitterBackend.username() + '/' + listId;
      }
      this._setTimelinePath(u[1] + '/lists/' + u[2] + '/statuses');
    } else {
      this._setTimelinePath(null);
    }

    this.timelineData = listId;
    this.tweetsCache = [];
    this.newTweetsCache = [];
    this.unreadNotified = [];
    this.firstRun = true;
    this._stopTimer();

    currentLists[this.orderNumber] = listId;
    this.template.setUserData(currentLists);
  }
});