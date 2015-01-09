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

  _extendParams: function(params) {
    if (this.listIdParts) {
      params.owner_screen_name = this.listIdParts[1];
      params.slug = this.listIdParts[3];
      delete params.count;
      delete params.per_page;
    }
  },

  /* overridden */
  _changeData: function(listId) {
    var currentLists = this.template.getUserData(), u = null;
    if(!currentLists) {
      currentLists = [];
    }

    if(listId) {
      u = listId.split("/");
      if(u.length < 3) {
        // Backward compatibility with previous listId format
        u = [null, this.manager.twitterBackend.username(), listId];
        listId = '/' + this.manager.twitterBackend.username() + '/' + listId;
      }
      this._setTimelinePath('lists/statuses');
    } else {
      this._setTimelinePath(null);
    }

    this.timelineData = listId;
    this.listIdParts = u;
    this.reset();

    currentLists[this.orderNumber] = listId;
    this.template.setUserData(currentLists);
  }
});