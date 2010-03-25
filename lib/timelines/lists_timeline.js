function ListsTweetsTimeline(timelineId, manager, template, listId, orderNumber) {
  TweetsTimeline.call(this, timelineId, manager, template);
  this.listId = listId;
  this.orderNumber = orderNumber;
}

$.extend(ListsTweetsTimeline.prototype, TweetsTimeline.prototype, {
  init: function() {
    if(this.listId) {
      this.changeList(this.listId);
    }
    this.giveMeTweets(function() {});
  },

  changeList: function(listId) {
    var currentLists = [];
    try {
      currentLists = JSON.parse(this.template.userData);
    } catch(e) { /* ignoring */ }

    this._setTimelinePath(this.manager.twitterBackend.username() + '/lists/' + listId + '/statuses');
    this.listId = listId;

    currentLists[this.orderNumber] = listId;
    OptionsBackend.saveOption(this.template.id + '_user_data', JSON.stringify(currentLists));
  }
});