function TimelineTemplate(timelineTemplateId, tweetManager) {
  this.setVisible = function(visible) {
    this.visible = visible;
    OptionsBackend.saveOption(this.optionsPrefix + '_visible', this.visible);
  };

  this.setIncludeInUnified = function(includeInUnified) {
    this.includeInUnified = includeInUnified;
    OptionsBackend.saveOption(this.optionsPrefix + '_include_unified', this.includeInUnified);
  };

  this.setShowOnPageNotification = function(showNotification) {
    this.showOnPageNotification = showNotification;
    OptionsBackend.saveOption(this.optionsPrefix + '_on_page', this.showOnPageNotification);
  };

  this.setShowIconNotification = function(showIconChange) {
    this.showIconNotification = showIconChange;
    OptionsBackend.saveOption(this.optionsPrefix + '_icon', this.showIconNotification);
  };

  this.getUserData = function() {
    if(!this.userData) {
      return null;
    }
    return JSON.parse(this.userData);
  };

  this.setUserData = function(data) {
    this.userData = JSON.stringify(data);
    OptionsBackend.saveOption(this.optionsPrefix + '_user_data', this.userData);
  };

  this.loadOptions = function() {
    this.visible = OptionsBackend.get(this.optionsPrefix + '_visible');
    this.refreshInterval = OptionsBackend.get(this.optionsPrefix + '_refresh_interval');
    this.includeInUnified = OptionsBackend.get(this.optionsPrefix + '_include_unified') && OptionsBackend.get('unified_visible');

    this.showIconNotification = OptionsBackend.get(this.optionsPrefix + '_icon');
    this.iconNotificationColor = OptionsBackend.get(this.optionsPrefix + '_color');
    this.showOnPageNotification = OptionsBackend.get(this.optionsPrefix + '_on_page');
    this.userData = OptionsBackend.get(this.optionsPrefix + '_user_data');
    this.overlayColor = OptionsBackend.get(this.optionsPrefix + '_tweets_color');
  };

  this.initTemplate = function() {
    this.loadOptions();
    this.multipleTimelines = false;
    this.hiddenTemplate = false;

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
        this.templatePath = 'statuses/mentions_timeline';
        this.factory = new DefaultTimelineFactory(this);
        break;
      case TimelineTemplate.DMS:
        this.timelineName = chrome.i18n.getMessage("w_DM");
        this.factory = new UnifiedDMsTimelineFactory(this);
        break;
      case TimelineTemplate.SENT_DMS:
        this.hiddenTemplate = true;
        this.timelineName = chrome.i18n.getMessage("w_SentDM");
        this.templatePath = 'direct_messages/sent';
        this.factory = new DMTimelineFactory(this);
        break;
      case TimelineTemplate.RECEIVED_DMS:
        this.hiddenTemplate = true;
        this.timelineName = chrome.i18n.getMessage("w_ReceivedDM");
        this.templatePath = 'direct_messages';
        this.factory = new DMTimelineFactory(this);
        break;
      case TimelineTemplate.FAVORITES:
        this.timelineName = chrome.i18n.getMessage("w_Favorites");
        this.templatePath = 'favorites/list';
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
      default:
        // bug
        throw 'unrecognized timeline template id';
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
  this.optionsPrefix = this.id;
  if(this.id == TimelineTemplate.SENT_DMS || this.id == TimelineTemplate.RECEIVED_DMS) {
    this.optionsPrefix = TimelineTemplate.DMS;
  }

  this.tweetManager = tweetManager;
  this._templateUniqueId = 0;

  this.initTemplate();
}
$.extend(TimelineTemplate, {
  UNIFIED: 'unified',
  HOME: 'home',
  MENTIONS: 'mentions',
  DMS: 'dms',
  SENT_DMS: 'sentdms',
  RECEIVED_DMS: 'receiveddms',
  FAVORITES: 'favorites',
  LISTS: 'lists',
  SEARCH: 'search'
});

/* 'Class' methods */
TimelineTemplate.initTemplates = function(tweetManager) {
  this.timelineNames = [TimelineTemplate.UNIFIED, TimelineTemplate.HOME, TimelineTemplate.MENTIONS,
                        TimelineTemplate.DMS, TimelineTemplate.SENT_DMS, TimelineTemplate.RECEIVED_DMS,
                        TimelineTemplate.FAVORITES, TimelineTemplate.LISTS, TimelineTemplate.SEARCH];
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
TimelineTemplate.eachTimelineTemplate = function(callback, includeHidden) {
  for(var i = 0, len = this.timelineNames.length; i < len; ++i) {
    var template = this.timelineTemplates[this.timelineNames[i]];
    if(template.hiddenTemplate && !includeHidden) {
      continue;
    }
    var ret = callback(template);
    if(ret === false) break;
  }
};
TimelineTemplate.reloadOptions = function() {
  TimelineTemplate.eachTimelineTemplate(function(template) {
    template.loadOptions();
  });
};