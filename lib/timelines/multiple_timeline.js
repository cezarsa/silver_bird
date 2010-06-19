function MultipleTweetsTimeline(timelineId, manager, template, timelineData, orderNumber) {
  TweetsTimeline.call(this, timelineId, manager, template);
  this.timelineData = timelineData;
  this.orderNumber = parseInt(orderNumber);
}

$.extend(MultipleTweetsTimeline.prototype, TweetsTimeline.prototype, {
  /* overridden */
  init: function() {
    if(this.timelineData) {
      this._changeData(this.timelineData);
    }
    this._baseInit();
  },

  /* overridden */
  remove: function() {
    var currentData = this.template.getUserData();
    if(!currentData) {
      currentData = [];
    }
    currentData.splice(this.orderNumber, 1);
    this.template.setUserData(currentData);

    if(currentData.length == 0) {
      this.template.setVisible(false);
    } else {
      var _this = this;
      this.manager.eachTimeline(function(timeline) {
        if(timeline.template.id == _this.template.id) {
          if(timeline.orderNumber > _this.orderNumber) {
            timeline.orderNumber -= 1;
          }
        }
      }, true);
    }

    this.killTimeline();
    return true;
  }
});