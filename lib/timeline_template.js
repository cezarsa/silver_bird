function TimelineTemplate(timelineTemplateId, tweetManager) {
  this.setVisible = function(visible) {
    this.visible = visible;
    OptionsBackend.saveOption(this.id + '_visible', this.visible);
  };

  this.setIncludeInUnified = function(includeInUnified) {
    this.includeInUnified = includeInUnified;
    OptionsBackend.saveOption(this.id + '_include_unified', this.includeInUnified);
  };

  this.setShowOnPageNotification = function(showNotification) {
    this.showOnPageNotification = showNotification;
    OptionsBackend.saveOption(this.id + '_on_page', this.showOnPageNotification);
  };

  this.setShowIconNotification = function(showIconChange) {
    this.showIconNotification = showIconChange;
    OptionsBackend.saveOption(this.id + '_icon', this.showIconNotification);
  };

  this.getUserData = function() {
    if(!this.userData) {
      return null;
    }
    return JSON.parse(this.userData);
  };

  this.setUserData = function(data) {
    this.userData = JSON.stringify(data);
    OptionsBackend.saveOption(this.id + '_user_data', this.userData);
  };

  this.loadOptions = function() {
    this.visible = OptionsBackend.get(this.id + '_visible');
    this.refreshInterval = OptionsBackend.get(this.id + '_refresh_interval');
    this.includeInUnified = OptionsBackend.get(this.id + '_include_unified') && OptionsBackend.get('unified_visible');

    this.showIconNotification = OptionsBackend.get(this.id + '_icon');
    this.iconNotificationColor = OptionsBackend.get(this.id + '_color');
    this.showOnPageNotification = OptionsBackend.get(this.id + '_on_page');
    this.userData = OptionsBackend.get(this.id + '_user_data');
  };

  this.initTemplate = function() {
    this.loadOptions();
    this.multipleTimelines = false;

    switch(this.id) {
      case TimelineTemplate.UNIFIED:
        this.timelineName = chrome.i18n.getMessage("w_Unified");
        this.factory = new UnifiedTimelineFactory(this);
        break;
      case TimelineTemplate.HOME:
        this.timelineName = chrome.i18n.getMessage("w_Home");
        this.templatePath = 'statuses/home_timeline';
        this.factory = new DefaultTimelineFactory(this);
        break;
      case TimelineTemplate.MENTIONS:
        this.timelineName = '@';
        this.templatePath = 'statuses/mentions';
        this.factory = new DefaultTimelineFactory(this);
        break;
      case TimelineTemplate.DMS:
        this.timelineName = chrome.i18n.getMessage("w_DM");
        this.templatePath = 'direct_messages';
        this.factory = new DefaultTimelineFactory(this);
        break;
      case TimelineTemplate.FAVORITES:
        this.timelineName = chrome.i18n.getMessage("w_Favorites");
        this.templatePath = 'favorites';
        this.factory = new FavoritesTimelineFactory(this);
        break;
      case TimelineTemplate.LISTS:
        this.timelineName = chrome.i18n.getMessage("w_Lists");
        this.factory = new ListsTimelineFactory(this);
        this.multipleTimelines = true;
        break;
      case TimelineTemplate.SEARCH:
        this.timelineName = chrome.i18n.getMessage("w_Search");
        this.factory = new SearchTimelineFactory(this);
        this.multipleTimelines = true;
        break;
    }
  };

  this.createTimelines = function() {
    var createdTimelines = this.factory.create();
    this._templateUniqueId += createdTimelines.length;
    return createdTimelines;
  };

  this.addTimeline = function() {
    var addedTimeline = this.factory.addTimeline(this._templateUniqueId);
    this._templateUniqueId += 1;
    return addedTimeline;
  };

  this.id = timelineTemplateId;
  this.tweetManager = tweetManager;
  this._templateUniqueId = 0;

  this.initTemplate();
}
$.extend(TimelineTemplate, {
  UNIFIED: 'unified',
  HOME: 'home',
  MENTIONS: 'mentions',
  DMS: 'dms',
  FAVORITES: 'favorites',
  LISTS: 'lists',
  SEARCH: 'search'
});

/* 'Class' methods */
TimelineTemplate.initTemplates = function(tweetManager) {
  this.timelineNames = [TimelineTemplate.UNIFIED, TimelineTemplate.HOME, TimelineTemplate.MENTIONS,
                        TimelineTemplate.DMS, TimelineTemplate.FAVORITES, TimelineTemplate.LISTS,
                        TimelineTemplate.SEARCH];
  this.timelineTemplates = {};
  this.tweetManager = tweetManager;
  for(var i = 0, len = this.timelineNames.length; i < len; ++i) {
    this.timelineTemplates[this.timelineNames[i]] = new TimelineTemplate(this.timelineNames[i], tweetManager);
  }
};
TimelineTemplate.initAfterAuthentication = function() {
  TimelineTemplate.getTemplate(TimelineTemplate.MENTIONS).timelineName = '@' + this.tweetManager.twitterBackend.username();
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
TimelineTemplate.reloadOptions = function() {
  TimelineTemplate.eachTimelineTemplate(function(template) {
    template.loadOptions();
  });
};