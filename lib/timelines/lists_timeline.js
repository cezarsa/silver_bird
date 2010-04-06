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
  _changeData: function(listId) {
    var currentLists = this.template.getUserData();
    if(!currentLists) {
      currentLists = [];
    }

    this.timelineData = listId;
//    this._setTimelinePath(this.manager.twitterBackend.username() + '/lists/' + this.timelineData + '/statuses');
    var u = listId.split("/");
    timeline.setTimelinePath(u[1] + '/lists/' + u[2] + '/statuses');
    this.tweetsCache = [];
    this.newTweetsCache = [];
    this.unreadNotified = [];
    this.firstRun = true;
    this._stopTimer();

    currentLists[this.orderNumber] = listId;
    this.template.setUserData(currentLists);
  }
});