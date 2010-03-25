function TimelineTemplate(timelineTemplateId, tweetManager) {
  this.setVisible = function(visible) {
    this.visible = visible;
    OptionsBackend.saveOption(this.id + '_visible', this.visible);
  };

  this.loadOptions = function() {
    this.visible = OptionsBackend.get(this.id + '_visible');
    this.refreshInterval = OptionsBackend.get(this.id + '_refresh_interval');
    this.includeInUnified = OptionsBackend.get(this.id + '_include_unified') && OptionsBackend.get('unified_visible');

    this.showIconNotification = OptionsBackend.get(this.id + '_icon');
    this.iconNotificationColor = OptionsBackend.get(this.id + '_color');
    this.showOnPageNotification = OptionsBackend.get(this.id + '_on_page');
    this.userData = OptionsBackend.get(this.id + '_user_data');

    switch(this.id) {
      case TimelineTemplate.UNIFIED:
        this.timelineName = 'Unified';
        this.factory = new UnifiedTimelineFactory(this);
        break;
      case TimelineTemplate.HOME:
        this.timelineName = 'Home';
        this.templatePath = 'statuses/home_timeline';
        this.factory = new DefaultTimelineFactory(this);
        break;
      case TimelineTemplate.MENTIONS:
        this.timelineName = '@<span class="__username">';
        this.templatePath = 'statuses/mentions';
        this.factory = new DefaultTimelineFactory(this);
        break;
      case TimelineTemplate.DMS:
        this.timelineName = 'DM';
        this.templatePath = 'direct_messages';
        this.factory = new DefaultTimelineFactory(this);
        break;
      case TimelineTemplate.FAVORITES:
        this.timelineName = 'Favorites';
        this.templatePath = 'favorites';
        this.factory = new FavoritesTimelineFactory(this);
        break;
      case TimelineTemplate.LISTS:
        this.timelineName = 'Lists'
        this.factory = new ListsTimelineFactory(this);
        break;
    }
  };

  this.createTimelines = function() {
    return this.factory.create();
  };

  this.id = timelineTemplateId;
  this.tweetManager = tweetManager;
  this.loadOptions();
}
$.extend(TimelineTemplate, {
  UNIFIED: 'unified',
  HOME: 'home',
  MENTIONS: 'mentions',
  DMS: 'dms',
  FAVORITES: 'favorites',
  LISTS: 'lists'
});

/* 'Class' methods */
TimelineTemplate.initTemplates = function(tweetManager) {
  this.timelineNames = [TimelineTemplate.UNIFIED, TimelineTemplate.HOME, TimelineTemplate.MENTIONS,
                        TimelineTemplate.DMS, TimelineTemplate.FAVORITES, TimelineTemplate.LISTS];
  this.timelineTemplates = {};
  this.tweetManager = tweetManager;
  for(var i = 0, len = this.timelineNames.length; i < len; ++i) {
    this.timelineTemplates[this.timelineNames[i]] = new TimelineTemplate(this.timelineNames[i], tweetManager);
  }
};
TimelineTemplate.getTemplate = function(templateId) {
  return this.timelineTemplates[templateId];
};
TimelineTemplate.eachTimelineTemplate = function(callback) {
  for(var i = 0, len = this.timelineNames.length; i < len; ++i) {
    var ret = callback(this.timelineTemplates[this.timelineNames[i]]);
    if(ret === false) break;
  }
};