/*
TimelineFactory contract:
 - TimelineFactory(Template)
 # create() -> [Timeline1, Timeline2]
 # addTimeline() -> Timeline
*/
function TimelineFactory(template) {
  this.tweetManager = template.tweetManager;
  this.template = template;
}
TimelineFactory.prototype = {
  addTimeline: function() {
    /* Default addTimeline should do nothing */
    return null;
  }
};

/*
  Default Timeline Factory
*/
function DefaultTimelineFactory(template) {
  TimelineFactory.call(this, template);
}
DefaultTimelineFactory.prototype = $.extend({}, TimelineFactory.prototype, {
  create: function() {
    if(this.template.visible || this.template.includeInUnified) {
      return [new TweetsTimeline(this.template.id, this.tweetManager, this.template)];
    }
    return [];
  }
});

/*
  Mentions Timeline Factory
*/
function MentionsTimelineFactory(template) {
  TimelineFactory.call(this, template);
}
MentionsTimelineFactory.prototype = $.extend({}, TimelineFactory.prototype, {
  create: function() {
    if(this.template.visible || this.template.includeInUnified) {
      return [new MentionsTweetsTimeline(this.template.id, this.tweetManager, this.template)];
    }
    return [];
  }
});

/*
  Favorites Timeline Factory
*/
function FavoritesTimelineFactory(template) {
  TimelineFactory.call(this, template);
}
FavoritesTimelineFactory.prototype = $.extend({}, TimelineFactory.prototype, {
  create: function() {
    if(this.template.visible || this.template.includeInUnified) {
      return [new FavoritesTweetsTimeline(this.template.id, this.tweetManager, this.template)];
    }
    return [];
  }
});

/*
  Unified Timeline Factory
*/
function UnifiedTimelineFactory(template) {
  TimelineFactory.call(this, template);
}
UnifiedTimelineFactory.prototype = $.extend({}, TimelineFactory.prototype, {
  create: function() {
    if(this.template.visible) {
      return [new UnifiedTweetsTimeline(this.template.id, this.tweetManager, this.template)];
    }
    return [];
  }
});

/*
  Lists Timeline Factory
*/
function ListsTimelineFactory(template) {
  TimelineFactory.call(this, template);
}
ListsTimelineFactory.prototype = $.extend({}, TimelineFactory.prototype, {
  create: function() {
    if(this.template.visible || this.template.includeInUnified) {
      var currentLists = this.template.getUserData();
      if(!currentLists || currentLists.length == 0) {
        currentLists = [null];
      }
      this.template.setUserData(currentLists);
      var ret = [];
      for(var i in currentLists) {
        ret.push(new ListsTweetsTimeline(this.template.id + '_' + i, this.tweetManager, this.template, currentLists[i], i));
      }
      return ret;
    }
    return [];
  },

  addTimeline: function(uniqueId) {
    var currentLists = this.template.getUserData();
    if(!currentLists) {
      currentLists = [];
    }
    currentLists.push(null);
    this.template.setUserData(currentLists);
    var index = currentLists.length - 1;
    var timeline = new ListsTweetsTimeline(this.template.id + '_' + uniqueId, this.tweetManager, this.template, currentLists[index], index);
    return timeline;
  }
});

