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
  Regular DM Timeline Factory
*/
function DMTimelineFactory(template) {
  TimelineFactory.call(this, template);
}
DMTimelineFactory.prototype = $.extend({}, TimelineFactory.prototype, {
  create: function() {
    if(this.template.visible || this.template.includeInUnified || TimelineTemplate.getTemplate(TimelineTemplate.DMS).visible) {
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
  DMs Unified Timeline Factory
*/
function UnifiedDMsTimelineFactory(template) {
  TimelineFactory.call(this, template);
}
UnifiedDMsTimelineFactory.prototype = $.extend({}, TimelineFactory.prototype, {
  create: function() {
    if(this.template.visible || this.template.includeInUnified) {
      return [new UnifiedDMsTweetsTimeline(this.template.id, this.tweetManager, this.template, this.tweetManager.timelines)];
    }
    return [];
  }
});

/*
  Multiple Timeline Factory - Base class for templates supporting multiple timelines
  (e.g. Lists, Search)
*/
function MultipleTimelineFactory(template) {
  TimelineFactory.call(this, template);
}
MultipleTimelineFactory.prototype = $.extend({}, TimelineFactory.prototype, {
  create: function() {
    if(this.template.visible) {
      var currentData = this.template.getUserData();
      if(!currentData || currentData.length === 0) {
        currentData = [null];
      }
      this.template.setUserData(currentData);
      var ret = [];
      for(var i = 0, len = currentData.length; i < len; ++i) {
        ret.push(this._instantiateTimeline(this.template.id + '_' + i, this.tweetManager, this.template, currentData[i], i));
      }
      return ret;
    }
    return [];
  },

  addTimeline: function(uniqueId) {
    var currentData = this.template.getUserData();
    if(!currentData) {
      currentData = [];
    }
    currentData.push(null);
    this.template.setUserData(currentData);
    var index = currentData.length - 1;
    var timeline = this._instantiateTimeline(this.template.id + '_' + uniqueId, this.tweetManager, this.template, currentData[index], index);
    return timeline;
  },

  _instantiateTimeline: function(timelineId, manager, template, data, orderNumber) {
    throw '_instantiateTimeline must be overridden';
  }
});

/*
  Lists Timeline Factory
*/
function ListsTimelineFactory(template) {
  MultipleTimelineFactory.call(this, template);
}
ListsTimelineFactory.prototype = $.extend({}, MultipleTimelineFactory.prototype, {
  _instantiateTimeline: function(timelineId, manager, template, data, orderNumber) {
    return new ListsTweetsTimeline(timelineId, manager, template, data, orderNumber);
  }
});

/*
  Search Timeline Factory
*/
function SearchTimelineFactory(template) {
  MultipleTimelineFactory.call(this, template);
}
SearchTimelineFactory.prototype = $.extend({}, MultipleTimelineFactory.prototype, {
  _instantiateTimeline: function(timelineId, manager, template, data, orderNumber) {
    return new SearchTweetsTimeline(timelineId, manager, template, data, orderNumber);
  }
});

