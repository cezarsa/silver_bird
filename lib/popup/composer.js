var Composer = {
  replyId: null,
  replyUser: null,
  rtId: null,
  destroyId: null,
  favoriteId: null,
  destroyTimelineId: null,

  bindEvents: function() {
    var baseElement = $("#compose_tweet_area"),
        shortenerArea = baseElement.find("#shortener_area"),
        composeTrigger = $("#compose_tweet");

    baseElement.find("textarea").bind("keyup blur", Composer.textareaChanged.bind(Composer));
    baseElement.find(".footer #tweetit").bind("click", Composer.sendTweet.bind(Composer));
    baseElement.find(".footer #image_input").bind("change", ImageUpload.upload.bind(ImageUpload));

    composeTrigger.bind("click", function() {
      Composer.showComposeArea();
    });

    shortenerArea.find("input").bind("focus", Shortener.focus.bind(Shortener));
    shortenerArea.find("input").bind("keyup", Shortener.changed.bind(Shortener));
    shortenerArea.find("input").bind("blur", Shortener.blur.bind(Shortener));
    shortenerArea.find("#shorten_current").bind("click", Shortener.shortenCurrentPage.bind(Shortener));
    shortenerArea.find("#shortener_button").bind("click", function() {
      Shortener.shortenIt();
    });

  },

  init: function() {
    if(tweetManager.composerData.isComposing) {
      Composer.initMessage(tweetManager.composerData.saveMessage, tweetManager.composerData.replyId,
          tweetManager.composerData.replyUser, false);
    }
    Composer.textareaChanged();
  },

  initMessage: function(message, replyId, replyUser, shouldAnimate) {
    Composer.replyId = replyId;
    Composer.replyUser = replyUser;
    $("#compose_tweet_area textarea").val(message || '');
    Composer.showComposeArea(true, !shouldAnimate);
    Composer.textareaChanged();
  },

  share: function (node) {
    Composer.showComposeArea(true);
    var el = $("#compose_tweet_area textarea");
    var user = $(".user", node).attr('screen_name');
    var msg = $(".text", node).text();
    el.val("RT @" + user + ": " + msg);
    Composer.textareaChanged();
  },

  confirmDestroy: function() {
    $("#loading").show();
    $(".rt_confirm").hide();
    var _this = this;

    tweetManager.destroy(function(success, data, status) {
      $("#loading").hide();
      var notFound = status && status.match(/Not Found/);
      if(success || notFound) {
        $(".tweet[tweetid='" + _this.destroyId + "']").parents('.tweet_space').first().hide('blind', { direction: "vertical" });
        var currentCount = tweetManager.getCurrentTimeline().getTweetsCache().length;
        if(currentCount < OptionsBackend.get('tweets_per_page')) {
          Paginator.nextPage();
        }
      } else {
        Renderer.showError(chrome.i18n.getMessage("ue_deletingTweet", status), Composer.confirmDestroy.bind(Composer));
      }
    }, this.destroyTimelineId, this.destroyId);
  },

  denyDestroy: function() {
    $(".rt_confirm").hide();
  },

  destroy: function (node) {
    $(".rt_confirm").hide();
    $(".rt_confirm.destroy", node).show();
    this.destroyId = $(node).attr('tweetid');
    this.destroyTimelineId = $(node).attr('timelineid');
  },

  confirmRT: function() {
    $("#loading").show();
    $(".rt_confirm").hide();
    var _this = this;
    tweetManager.postRetweet(function(success, data, status) {
      $("#loading").hide();
      if(success) {
        loadTimeline(true, "home");
      } else {
        Renderer.showError(chrome.i18n.getMessage("ue_retweeting", status), Composer.confirmRT.bind(Composer));
      }
    }, _this.rtId);
  },

  denyRT: function() {
    $(".rt_confirm").hide();
  },

  retweet: function (node) {
    $(".rt_confirm").hide();
    $(".rt_confirm", node).show();
    this.rtId = $(node).attr('tweetid');
  },

  favorite: function (node) {
    if(node) {
      this.favoriteId = $(node).attr('tweetid');
    }
    $("#loading").show();
    tweetManager.favorite(function(success, data, status) {
      $("#loading").hide();
      if(success) {
         Paginator.needsMore = false;
         loadTimeline();
      } else {
        Renderer.showError(chrome.i18n.getMessage("ue_markFavorite", status), Composer.favorite.bind(Composer));
      }
    }, this.favoriteId);
  },

  unFavorite: function (node) {
    if(node) {
      this.favoriteId = $(node).attr('tweetid');
    }
    $("#loading").show();
    tweetManager.unFavorite(function(success, data, status) {
      $("#loading").hide();
      if(success) {
         Paginator.needsMore = false;
         loadTimeline();
      } else {
        Renderer.showError(chrome.i18n.getMessage("ue_unmarkFavorite", status), Composer.unFavorite.bind(Composer));
      }
    }, this.favoriteId);
  },

  addUser: function (replies) {
    var textArea = $("#compose_tweet_area textarea");
    var currentVal = textArea.val();
    replies =  replies || [];
    if(currentVal.length > 0 && currentVal[currentVal.length - 1] != ' ') {
      currentVal += ' ';
    }
    currentVal += replies.join(' ') + ' ';
    textArea.val(currentVal);
  },

  reply: function (node) {
    Composer.showComposeArea(true);

    var textArea = $("#compose_tweet_area textarea");
    var user = $(".user", node).attr('screen_name');
    var timelineId = $(node).attr('timelineid');

    if(timelineId == TimelineTemplate.RECEIVED_DMS || timelineId == TimelineTemplate.SENT_DMS) {
      textArea.val("d " + user + " ");
      Composer.textareaChanged();
      return;
    }

    var currentVal = textArea.val();
    var replies = ['@'+user];
    var ownName = tweetManager.twitterBackend.username();
    if (reply_all) {
      $(".text a", node).each(function(){
        var t = $(this).text();
        if (t !== ownName && (/^[A-Z0-9_-]{1,15}$/i).test(t)) {
          var user = '@' + t;
          if (replies.indexOf(user) == -1)
            replies.push(user);
        }
      });
    }

    if(Composer.replyId && currentVal.indexOf(Composer.replyUser) != -1) {
      this.addUser(replies);
      Composer.textareaChanged();
      return;
    }

    this.addUser(replies);
    tweetManager.composerData.replyId = Composer.replyId = $(node).attr('tweetid');
    tweetManager.composerData.replyUser = Composer.replyUser = user;

    Composer.textareaChanged();
  },

  showComposeArea: function (showOnly, noAnimation) {
    var composeArea = $("#compose_tweet_area");
    var textarea = $("textarea", composeArea);
    var visible = composeArea.is(':visible');

    if(!visible) {
      if(noAnimation) {
        composeArea.show();
      } else {
        composeArea.show('blind', { direction: "vertical" }, 'normal', function() {
          textarea[0].selectionStart = textarea[0].selectionEnd = textarea.val().length;
          textarea.focus();
        });
      }
      $("#compose_tweet img").attr('src', 'img/arrow_up.gif');
      tweetManager.composerData.isComposing = true;
      tweetManager.composerData.replyId = Composer.replyId;
      tweetManager.composerData.replyUser = Composer.replyUser;
    } else if(!showOnly) {
      if(noAnimation) {
        composeArea.hide();
      } else {
        composeArea.hide('blind', { direction: "vertical" });
      }
      $("#compose_tweet img").attr('src', 'img/arrow_down.gif');
      tweetManager.composerData.saveMessage = '';
      tweetManager.composerData.isComposing = false;
      tweetManager.composerData.replyId = null;
      tweetManager.composerData.replyUser = null;
      Shortener.closeArea();
    }

    if((visible && showOnly) || (!visible && noAnimation)) {
      textarea[0].selectionStart = textarea[0].selectionEnd = textarea.val().length;
      textarea.focus();
    }
  },

  textareaChanged: function (e) {
    var el = $("#compose_tweet_area textarea");
    tweetManager.composerData.saveMessage = el.val();
    var availableChars = MAX_TWEET_SIZE - el.val().length;
    var charsLeftEl = $("#compose_tweet_area .chars_left");
    charsLeftEl.text(availableChars);
    if(availableChars < 0 || availableChars == MAX_TWEET_SIZE) {
      if(availableChars < 0) {
        charsLeftEl.css('color', 'red');
      }
      $("#compose_tweet_area input[type='button']").attr("disabled", "disabled");
    } else {
      charsLeftEl.css('color', 'black');
      $("#compose_tweet_area input[type='button']").removeAttr("disabled");
      if(e && e.ctrlKey && e.which == 13) { // Ctrl + Enter
        this.sendTweet();
      }
    }
  },

  sendTweet: function () {
    var textarea = $("#compose_tweet_area textarea");
    tweetManager.enqueueTweet(textarea.val(), Composer.replyId, Composer.replyUser);

    textarea.val("");
    Composer.replyId = null;
    Composer.textareaChanged();
    Composer.showComposeArea();
    Shortener.clear();
  },

  refreshNew: function() {
    // FIXME: #loading shouldn't be used for that.
    if($("#loading").is(":visible")) {
      return;
    }
    loadTimeline(true);
  },

  isVisible: function() {
    var composeArea = $("#compose_tweet_area");
    var textarea = $("textarea", composeArea);
    var visible = composeArea.is(':visible');
    return visible && textarea.val().length > 0;
  },

  addText: function(value) {
    var textarea = $("#compose_tweet_area textarea");
    var tmpText = textarea.val();
    if(tmpText.length > 0) {
      if((textarea[0].selectionStart > 0) &&
        (tmpText[textarea[0].selectionStart-1] != ' ')) {
        value = ' ' + value;
      }
      if((textarea[0].selectionEnd < tmpText.length) &&
         (tmpText[textarea[0].selectionEnd+1] != ' ')) {
         value += ' ';
      }
    }
    textarea.insertAtCaret(value);
    Composer.textareaChanged();
  }
};
