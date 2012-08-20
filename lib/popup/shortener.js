var Shortener = {
  SHORTENER_IDLE_STR: chrome.i18n.getMessage("shortenerIdleString"),

  init: function() {
    var savedUrl = tweetManager.composerData.urlShortener;
    if(savedUrl !== '') {
      $("#shortener_area input").val(savedUrl);
    }
    this.blur();
  },

  clear: function() {
    $("#shortener_area input").val('');
    this.blur();
  },

  closeArea: function() {
    tweetManager.composerData.urlShortener = '';
  },

  focus: function() {
    var shortener = $("#shortener_area input");
    var val = shortener.val();
    if(val == this.SHORTENER_IDLE_STR) {
      shortener.val('');
      shortener.removeAttr('style');
    }
  },

  showButton: function() {
    var shortenerButton = $("#shortener_button div");
    if(!shortenerButton.is(":visible"))
      shortenerButton.show('blind', { direction: "vertical" }, 'fast');
  },

  hideButton: function() {
    var shortenerButton = $("#shortener_button div");
    if(shortenerButton.is(":visible"))
      shortenerButton.hide('blind', { direction: "vertical" }, 'fast');
  },

  blur: function() {
    var shortener = $("#shortener_area input");
    var val = shortener.val();
    if($.trim(val) === '' || val == this.SHORTENER_IDLE_STR) {
      shortener.val(this.SHORTENER_IDLE_STR);
      shortener.attr('style', 'color: #aaa;');
      this.hideButton();
    } else {
      this.showButton();
    }
  },

  changed: function(e) {
    var shortener = $("#shortener_area input");
    var val = shortener.val();
    tweetManager.composerData.urlShortener = val;
    if($.trim(val) !== '') {
      if(e.which == 13) { //Enter key
        this.shortenIt();
      } else {
        this.showButton();
      }
    } else {
      this.hideButton();
    }
  },

  shortenCurrentPage: function() {
    var _this = this;
    chrome.tabs.getSelected(null, function(tab) {
      var shortenerInput = $("#shortener_area input");
      shortenerInput.val(tab.url);
      _this.shortenIt({title: tab.title});
    });
  },

  shortenIt: function(context) {
    var shortenerInput = $("#shortener_area input");
    var longUrl = shortenerInput.val();
    this.shortenPage(longUrl, context);
  },

  shortenPage: function(longUrl, context) {
    $("#loading").show();
    var shortenerInput = $("#shortener_area input");
    shortenerInput.attr('disabled', 'disabled');
    this.hideButton();
    var _this = this;
    shortener.shorten(longUrl, function(success, shortUrl) {
      $("#loading").hide();
      shortenerInput.removeAttr('disabled');
      _this.closeArea();
      _this.clear();
      var textarea = $("#compose_tweet_area textarea");
      if(success && shortUrl) {
        if(context && context.title && OptionsBackend.get('share_include_title')) {
          shortUrl = context.title + ' - ' + shortUrl;
        }
        Composer.addText(shortUrl);
      } else if(!success) {
        Renderer.showError(shortUrl);
      }
      Composer.showComposeArea(true);
    });
  }
};
