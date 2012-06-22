var MAX_TWEET_SIZE = 140;
var backgroundPage = chrome.extension.getBackgroundPage();

var Persistence = backgroundPage.Persistence;
var urlExpander = backgroundPage.urlExpander;
var tweetManager = backgroundPage.TweetManager.instance;
var twitterBackend = tweetManager.twitterBackend;
var OptionsBackend = backgroundPage.OptionsBackend;
var TimelineTemplate = backgroundPage.TimelineTemplate;
var ImageService = backgroundPage.ImageService;
var UploadManager = backgroundPage.UploadManager;

chrome.i18n.getMessage = backgroundPage.chrome.i18n.getMessage;

var microbloggingService = OptionsBackend.get('microblogging_service');
var TwitterLib;
if(microbloggingService == 'twitter') {
  TwitterLib = {
    URLS: {
      BASE: 'http://twitter.com/',
      SEARCH: 'http://twitter.com/search?q='
    }
  };
} else if(microbloggingService == 'identica') {
  TwitterLib = {
    URLS: {
      BASE: 'http://identi.ca/',
      SEARCH: 'http://identi.ca/search/notice?q='
    }
  };
}

if(backgroundPage.SecretKeys.hasValidKeys() && !twitterBackend.authenticated() && !twitterBackend.tokenRequested()) {
  twitterBackend.startAuthentication();
  window.close();
}
