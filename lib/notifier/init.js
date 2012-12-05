var OptionsBackend = chrome.extension.getBackgroundPage().OptionsBackend;
var urlExpander = chrome.extension.getBackgroundPage().urlExpander;
var tweetManager = chrome.extension.getBackgroundPage().TweetManager.instance;
var ImageService = chrome.extension.getBackgroundPage().ImageService;

chrome.i18n.getMessage = chrome.extension.getBackgroundPage().chrome.i18n.getMessage;

var fadeTimeout = OptionsBackend.get('notification_fade_timeout');
var disableAnimation = OptionsBackend.get('disable_notification_animation');

try {
  var tweet = tweetManager.injectTweets.shift();
  Renderer.setContext('desktop');
  $(document.body).prepend(Renderer.renderTweet(tweet, false, OptionsBackend.get('name_attribute')));
} catch(e) {
  console.log(e);
  window.close();
}

setTimeout(function() {
  $("#progress").text(chrome.i18n.getMessage("preventClosing"));
  var closefn = function() {
    // Tell manager that this tweet shouldn't be marked as read
    tweetManager.shouldNotReadMap[tweet.id] = true;
    window.close();
  };
  if (disableAnimation)
  {
    $('#progress').show().css('bottom','0px').css('width','100%');
    var tmout=setTimeout(closefn,fadeTimeout);
    $(document.body).click(function()
    {
        clearTimeout(tmout);
        $('#progress').hide();
    });
  } else
  {
      $('#progress').show().css('bottom', '0px').css('width', '100%').
          animate({width: '0px'}, fadeTimeout, 'linear', closefn);
      $(document.body).click(function() {
        $('#progress').stop().hide();
      });
  }
}, 100);

