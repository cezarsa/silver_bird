var loadingNewTweets = false;

function onTimelineRetrieved(tweets, timelineId) {
  if(!window) {
    //Sanity check, popup might be closed.
    return;
  }

  var timeline = tweetManager.getTimeline(timelineId);
  if(!timeline.template.visible) {
    return;
  }

  $("#loading").hide();
  if(tweets) {
    Paginator.needsMore = false;
    Renderer.assemblyTweets(tweets, timelineId);
    $("#timeline-" + timelineId + ' .inner_timeline').scrollTop(timeline.currentScroll);
  } else {
    var baseErrorMsg = tweetManager.currentError();
    var errorMsg = chrome.i18n.getMessage("ue_updatingTweets", baseErrorMsg);
    if(baseErrorMsg == '(timeout)') {
      errorMsg += chrome.i18n.getMessage("ue_updatingTweets2");
    }
    Renderer.showError(errorMsg, loadTimeline);
  }
  loadingNewTweets = false;

  prepareTimelines();
}

function loadTimeline(force, forcedTimeline) {
  loadingNewTweets = true;
  $("#loading").show();
  if(force) {
    Paginator.firstPage();
  }
  var cacheOnly = true;
  if(Paginator.needsMore) {
    cacheOnly = false;
  }
  if(!forcedTimeline) {
    forcedTimeline = tweetManager.currentTimelineId;
  }
  tweetManager.giveMeTweets(forcedTimeline, onTimelineRetrieved, force, cacheOnly);
}

function signout() {
  tweetManager.signout();
}

function suspend(forcedValue) {
  var suspendState = tweetManager.suspendTimelines(forcedValue);
  if(suspendState) {
    var nextOpacity = 0;
    function animateLoop() {
      if(nextOpacity == 1) {
        nextOpacity = 0.1;
      } else {
        nextOpacity = 1;
      }
      $("#suspended_notice").animate({opacity: nextOpacity}, 1500, null, animateLoop);
    }
    $("#suspended_notice").css({opacity: nextOpacity}).show();
    animateLoop();
    $("#suspend_toggle").text(chrome.i18n.getMessage("resume"));
  } else {
    $("#suspended_notice").stop().hide();
    $("#suspend_toggle").text(chrome.i18n.getMessage("suspend"));
  }
}

function showRateLimit() {
  if(!OptionsBackend.get('show_hits_in_popup')) {
    return;
  }

  var resetDateObj = new Date();
  var nowmin = new Date().getMinutes();

  $("#popup_footer").show();
  if(tweetManager.twitterBackend) {
    var hitsInfo = tweetManager.twitterBackend.remainingHitsInfo();
    $("#twitter_hits_left").text("API: "+ hitsInfo[0] + "/" + hitsInfo[2] + ",");

    resetDateObj.setTime(parseInt(hitsInfo[1], 10) * 1000);
    var leftMins = resetDateObj.getMinutes() - nowmin;
    if (leftMins < 0) leftMins = 60 + leftMins;
    $("#twitter_hits_reset").text(leftMins + " mins to reset");
  }
}

function newTweetsAvailable(count, unreadCount, timelineId) {
  if(!window) {
    //Sanity check, popup might be closed.
    return;
  }
  var currentTimeline = tweetManager.currentTimelineId;
  if(timelineId != currentTimeline) {
    if(unreadCount === 0) {
      $("#tab_modifier_" + timelineId).remove();
      return;
    }
    $("#tab_modifier_" + timelineId).remove();
    var timelineTabLink = $("a[href='#timeline-" + timelineId + "']");
    var divEl = $("<div class='tab_modifier'></div>").attr('id', "tab_modifier_" + timelineId);
    timelineTabLink.before(divEl);
    var modWidth = parseInt(timelineTabLink.parent().width(), 10) - 12;
    divEl.css({width: modWidth + 'px'});
    return;
  }
  if(count === 0)
    return;
  var tweets_string = count > 1 ? "tweet_plural" : "tweet_singular";
  $("#update_tweets").text(chrome.i18n.getMessage("newTweetsAvailable", [count, chrome.i18n.getMessage(tweets_string)]));
  $("#update_tweets").fadeIn();
}

function updateNotificationFunc(timeline) {
  var timelineId = timeline.timelineId;
  var newTweetsInfo = tweetManager.newTweetsCount(timelineId);
  var newTweetsCount = newTweetsInfo[0];

  if(timeline.timelineId == tweetManager.currentTimelineId && timeline.currentScroll === 0) {
    if(newTweetsCount > 0) {
      tweetManager.updateNewTweets();
      $("#tab_modifier_" + timelineId).remove();
    }
  } else {
    newTweetsAvailable(newTweetsCount, newTweetsInfo[1], timelineId);
  }
}

function loadNewTweets() {
  Paginator.firstPage(true);
  $("#tab_modifier_" + tweetManager.currentTimelineId).remove();
  $("#update_tweets").fadeOut();

  prepareAndLoadTimeline();
}

function loadTrends() {
  var currentTTLocale = OptionsBackend.get('trending_topics_woeid');

  $("#trending_topics").actionMenu({
    loading: 'img/loading.gif',
    parentContainer: '#workspace'
  });

  tweetManager.retrieveTrendingTopics(function(userData) {
    var actions = [];

    if(userData) {
      for(var i = 0, len = userData.trends.length; i < len; ++i) {
        (function(trendName) {
          actions.push({
            name: trendName,
            action: function(event) {
              TimelineTab.addNewSearchTab(trendName, event.isAlternateClick);
            }
          });
        })(userData.trends[i].name);
      }
    } else {
      actions.push({
        name: 'Error, try again.',
        action: function(event) {
          loadTrends();
        }
      });
    }

    $("#trending_topics").actionMenu({
      actions: actions
    });
  }, currentTTLocale);
}

function prepareTimelines() {
  $("#update_tweets").hide();

  updateNotificationFunc(tweetManager.getCurrentTimeline());
  tweetManager.eachTimeline(function(timeline) {
    if(timeline.timelineId != tweetManager.currentTimelineId) {
      updateNotificationFunc(timeline);
    }
  });
}

function prepareAndLoadTimeline() {
  prepareTimelines();
  loadTimeline();
}

function initializeWorkspace() {
  $(window).unload(function() {
    if(tweetManager) {
      tweetManager.registerWarningsCallback(null);
      tweetManager.registerNewTweetsCallback(null);
      tweetManager.sendQueue.cleanUpCallbacks();
    }
    if(UploadManager) {
      UploadManager.unregisterCallbacks();
    }
  });

  tweetManager.registerNewTweetsCallback(newTweetsAvailable);
  $("#workspace").show();
  ThemeManager.init();

  if(ThemeManager.isPopup) {
    Renderer.setContext('popup');
  } else {
    Renderer.setContext('standalone');
  }

  TimelineTab.init();
  tweetManager.orderedEachTimeline(function(timeline) {
    if(timeline.template.id == TimelineTemplate.SEARCH) {
      SearchTab.addSearchTab(timeline.timelineId);
    } else {
      TimelineTab.addTab(timeline.timelineId, timeline.template.timelineName);
    }
  });
  ThemeManager.handleSortableTabs();

  if(OptionsBackend.get('compose_position') == 'bottom') {
    var composeArea = $("#compose_tweet_area").detach();
    var composeButton = $("#compose_tweet").detach();
    $("#workspace").append(composeArea).append(composeButton);
  }

  //Delay loading, improving responsiveness
  setTimeout(function() {
    ThemeManager.initWindowResizing();
    Lists.init();
    ContextMenu.init();

    TimelineTab.select(tweetManager.currentTimelineId);
    Composer.init();
    Shortener.init();

    prepareAndLoadTimeline();

    var tabEl = $("#timeline-" + tweetManager.currentTimelineId + ' .inner_timeline');
    tabEl.scrollTop(tweetManager.getCurrentTimeline().currentScroll);

    tweetManager.registerWarningsCallback(function(msg, showHTML) {
      Renderer.warningsCallback.call(Renderer, msg, false, showHTML);
    });
    suspend(tweetManager.suspend);
    showRateLimit();

    WorkList.init();
    Autocomplete.init();
    $("#shorten_current").attr("title", chrome.i18n.getMessage("shorten_current"));
    $("#detach_img").attr("title", chrome.i18n.getMessage("detach_window"));

    $("#options_page_link").anyClick(function() {
      openTab(chrome.extension.getURL('options.html'));
    });
    
    loadTrends();
    
    ImageUpload.init();
  }, 0);
}


var bindEvents = function() {

  var baseElement = $(document);
  baseElement.find("#warning .dismiss").bind('click', Renderer.hideMessage.bind(Renderer));

  baseElement.find("#signout").bind('click', function(ev) {
    ev.preventDefault();
    signout();
  });

  baseElement.find("#refresh_trigger").bind('click', function(ev) {
    ev.preventDefault();
    Composer.refreshNew();
  });

  baseElement.find("#suspend_toggle").bind('click', function(ev) {
    ev.preventDefault();
    suspend();
  });

  baseElement.find("#mark_all_read_trigger").bind('click', function(ev) {
    ev.preventDefault();
    Renderer.markAllAsRead();
  });

  baseElement.find("#detach_trigger").bind('click', function(ev) {
    ev.preventDefault();
    Renderer.detach();
  });

  baseElement.find("#update_tweets").bind('click', loadNewTweets);

  baseElement.find("#btnAuthorize").bind('click', myOAuth.registerPin.bind(myOAuth));

  baseElement.find("#enter_pin a").bind('click', function(ev) {
    ev.preventDefault();
    myOAuth.requestNewToken();
  });

  Composer.bindEvents();
  WorkList.bindEvents();

};



$(function() {
  bindEvents();

  $("input.i18n").each(function() {
    $(this).val(chrome.i18n.getMessage(this.id));
  });

  $("span.i18n").each(function() {
    $(this).text(chrome.i18n.getMessage(this.id));
  });

  $("a.i18n").each(function() {
    $(this).text(chrome.i18n.getMessage(this.id));
  });

  if(!backgroundPage.SecretKeys.hasValidKeys()) {
    Renderer.showError(chrome.i18n.getMessage('invalid_keys'));
    $("#workspace").show().height(300);
    ThemeManager.init();
    return;
  }

  if(!twitterBackend.authenticated()) {
    if(twitterBackend.tokenRequested()) {
      $("#enter_pin").show();
    }
    return;
  }

  initializeWorkspace();
});
