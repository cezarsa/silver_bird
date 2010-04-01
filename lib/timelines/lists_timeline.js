function ListsTweetsTimeline(timelineId, manager, template, listId, orderNumber) {
  TweetsTimeline.call(this, timelineId, manager, template);
  this.listId = listId;
  this.orderNumber = orderNumber;
}

$.extend(ListsTweetsTimeline.prototype, TweetsTimeline.prototype, {
  /* overridden */
  init: function() {
    if(this.listId) {
      this.changeList(this.listId);
    }
    this.giveMeTweets(function() {});
  },

  /* overridden */
  remove: function() {
    var currentLists = this.template.getUserData();
    if(!currentLists) {
      currentLists = [];
    }
    var myOrderNumber = this.orderNumber;
    currentLists.splice(myOrderNumber, 1);
    this.template.setUserData(currentLists);

    if(currentLists.length == 0) {
      this.template.setVisible(false);
    } else {
      this.manager.eachTimeline(function(timeline) {
        if(timeline.template.id == TimelineTemplate.LISTS) {
          if(timeline.orderNumber > myOrderNumber) {
            timeline.orderNumber -= 1;
          }
        }
      }, true);
    }

    this.killTimeline();
    return true;
  },

  changeList: function(listId) {
    var currentLists = this.template.getUserData();
    if(!currentLists) {
      currentLists = [];
    }

    this._setTimelinePath(this.manager.twitterBackend.username() + '/lists/' + listId + '/statuses');
    this.listId = listId;

    currentLists[this.orderNumber] = listId;
    this.template.setUserData(currentLists);
  }
});