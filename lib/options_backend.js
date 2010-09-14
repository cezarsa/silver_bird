OptionsBackend = {
  defaultOptions: {
    home_refresh_interval: 90 * 1000,
    mentions_refresh_interval: 150 * 1000,
    dms_refresh_interval: 150 * 1000,
    lists_refresh_interval: 150 * 1000,
    favorites_refresh_interval: 600 * 1000,
    search_refresh_interval: 60 * 1000,
    blockedusers_refresh_interval: 3600 * 1000,
    tweets_per_page: 10,
    max_cached_tweets: 30,
    url_shortener: 'bitly',
    shortener_acct: false,
    shortener_login: '',
    shortener_key: '',
    share_include_title: false,
    name_attribute: 'name',
    request_timeout: 15000,
    compose_position: 'top',
    hover_timeout: 1000,

    microblogging_service: 'twitter',

    base_url: 'https://api.twitter.com/1/',
    base_oauth_url: 'https://twitter.com/oauth/',

    same_signing_urls: true,

    base_signing_url: 'https://api.twitter.com/1/',
    base_oauth_signing_url: 'https://twitter.com/oauth/',

    base_search_url: 'http://search.twitter.com/search',

    tweets_notification_style: 'on_page',
    home_on_page: false,
    home_icon: true,
    mentions_on_page: true,
    mentions_icon: true,
    dms_on_page: true,
    dms_icon: true,
    favorites_on_page: false,
    favorites_icon: false,
    lists_on_page: true,
    lists_icon: true,
    search_on_page: false,
    search_icon: false,

    home_visible: true,
    mentions_visible: true,
    dms_visible: true,
    favorites_visible: true,
    lists_visible: true,
    search_visible: true,

    unified_visible: true,
    home_include_unified: true,
    mentions_include_unified: true,
    dms_include_unified: true,
    favorites_include_unified: false,
    lists_include_unified: false,
    search_include_unified: false,

    reply_all: false,
    show_expanded_urls: true,

    lists_user_data: null,

    idle_color: '#4880a6',
    home_color: '#9c2e2e',
    mentions_color: '#7f870b',
    dms_color: '#7f870b',
    favorites_color: '#7f870b',
    lists_color: '#7f870b',
    search_color: '#7f870b',

    tweets_color_only_unified: false,
    home_tweets_color: 'rgba(0, 72, 255, 0.15)',
    mentions_tweets_color: 'rgba(255, 255, 0, 0.15)',
    dms_tweets_color: 'rgba(0, 255, 0, 0.15)',
    lists_tweets_color: 'rgba(255, 0, 0, 0.15)',
    favorites_tweets_color: 'rgba(0, 0, 0, 0)',
    search_tweets_color: 'rgba(0, 0, 0, 0)',

    notification_fade_timeout: 6000,
    theme: 'css/chromified.css,css/chromified-theme/jquery-ui-1.7.2.custom.css',
    font_family: 'Helvetica, Arial, sans-serif',
    font_size: '1.0em',
    show_hits_in_popup: false,
    show_user_autocomplete: true,

    notification_max_popups: -1
  },
  cachedOptions: null,
  optionsData: Persistence.options(),
  save: function(optionsMap, skipReload) {
    this.optionsData.save(JSON.stringify(optionsMap));
    if(skipReload) {
      return;
    }
    this.cachedOptions = this.load();
  },
  load: function(forceDefault) {
    var map = $.extend(true, {}, this.defaultOptions);
    if(forceDefault) {
      return map;
    }
    try {
      var parsedMap = JSON.parse(this.optionsData.val());
      if(parsedMap)
        $.extend(true, map, parsedMap);
    } catch(e) { /* ignored */ }
    return map;
  },
  saveOption: function(option, value) {
    if(this.cachedOptions == null) {
      this.cachedOptions = this.load();
    }
    this.cachedOptions[option] = value;
    this.save(this.cachedOptions, true);
  },
  get: function(option) {
    if(this.cachedOptions == null) {
      this.cachedOptions = this.load();
    }
    return this.cachedOptions[option];
  }
};