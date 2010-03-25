/*
TimelineFactory contract:
 - TimelineFactory(TweetManager, Template)
 # create() -> [Timeline1, Timeline2]
 # init(timeline) -> void
 # change(timeline, userData) -> void
*/
function TimelineFactory(template) {
  this.tweetManager = template.tweetManager;
  this.template = template;
}

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
      return [new UnifiedTweetsTimeline(this.template.id, this.tweetManager, this.template, this.tweetManager.timelines)];
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
      var currentLists = null;
      try {
        currentLists = JSON.parse(this.template.userData);
      } catch(e) { /* ignoring */ }
      if(!currentLists || currentLists.length == 0) {
        currentLists = [null];
      }
      var ret = [];
      for(var i in currentLists) {
        ret.push(new ListsTweetsTimeline(this.template.id + '_' + i, this.tweetManager, this.template, currentLists[i], i));
      }
      return ret;
    }
    return [];
  }
});

