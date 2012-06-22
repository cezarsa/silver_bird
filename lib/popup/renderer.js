$.extend(Renderer, {
  assemblyTweets: function (tweets, timelineId) {
    var destination = $("#timeline-" + timelineId + " .inner_timeline");
    if(destination.length === 0)
      return;

    var useColors = true;
    if(OptionsBackend.get('tweets_color_only_unified')) {
      if(timelineId != TimelineTemplate.UNIFIED) {
        useColors = false;
      }
    }

    var nameAttribute = OptionsBackend.get('name_attribute');
    var fragment = document.createDocumentFragment();
    for(var i = 0; i < tweets.length; ++i) {
      fragment.appendChild(Renderer.renderTweet(tweets[i], useColors, nameAttribute));
    }
    var destinationDom = destination[0];
    while(destinationDom.firstChild) {
      destinationDom.removeChild(destinationDom.firstChild);
    }
    destinationDom.appendChild(fragment);

    $(".tweet").live('mouseover mouseout', function(event) {
      if(event.type == 'mouseover') {
        $(".new_actions img:not(.starred)", this).css('display', 'inline');
      } else {
        $(".new_actions img:not(.starred)", this).css('display', 'none');
      }
    });

    var hoverFunc = function(event) {
      var $this = $(this);
      var old_src = $this.attr('src');
      var new_src = old_src;
      var isStarred = $this.is('.starred');
      var isHoverImage = old_src.match(/hover/);
      if((!isStarred && event.type == 'mouseover') || (isStarred && event.type == 'mouseout')) {
        if(!isHoverImage) {
          new_src = old_src.replace(/\.png/, '_hover.png');
        }
      } else {
        if(isHoverImage) {
          new_src = old_src.replace(/_hover/, '');
        }
      }
      $this.attr('src', new_src);
    };
    $(".new_actions img").live('mouseover mouseout', hoverFunc);

    $(".tweet.unread").click(function() {
      tweetManager.readTweet($(this).attr('tweetid'));
      $(this).stop();
      $(this).removeClass('unread');
      $(this).attr('style', '');
    });

    var hoverTimeout = OptionsBackend.get('hover_timeout');
    $(".tweet.unread").hoverFor(hoverTimeout,
      function() {
        //Hovering for <time> seconds, let's read it.
        tweetManager.readTweet($(this).attr('tweetid'));
        $(this).removeClass('unread');
        $(this).attr('style', '');
      },
      function() {
        //Starting countdown to read
        var testEl = $("<div class='tweet' style='display:none'></div>");
        $(document.body).append(testEl);
        var transformation = {};
        jQuery.each(['backgroundColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'borderTopColor', 'outlineColor'], function(i, attr) {
          var cssAttrName = attr.replace(/([A-Z])/g, '-$1').toLowerCase();
          var originValue = testEl.css(cssAttrName);
          if(originValue)
            transformation[attr] = originValue;
        });
        testEl.remove();
        $(this).animate(transformation, hoverTimeout);
      },
      function() {
        //Countdown aborted
        $(this).stop();
        $(this).attr('style', '');
      }
    );
  },

  markAllAsRead: function() {
    tweetManager.markTimelineAsRead();
    Paginator.needsMore = false;
    loadTimeline();
  },

  warningsCallback: function(msg, isError, showHTML) {
    if(isError) {
      Renderer.showError(msg, null, showHTML);
    } else {
      Renderer.showWarning(msg, showHTML);
    }
  },

  showWarning: function(msg, showHtml) {
    $("#warning .img_area img").attr('src', 'img/warning.png');
    if(showHtml) {
      msg = $("<span>").html(msg);
    } else {
      msg = $("<span>").text(msg);
    }
    Renderer.showMessage(msg);
  },

  showError: function(msg, tryAgainFunction, showHtml) {
    $("#warning .img_area img").attr('src', 'img/error.png');
    if(showHtml) {
      msg = $("<span>").html(msg);
    } else {
      msg = $("<span>").text(msg);
    }

    if(tryAgainFunction) {
      var link = $('<a href="#">').text(chrome.i18n.getMessage("tryAgain"));

      link.bind('click', function(ev) {
        ev.preventDefault();
        tryAgainFunction();
      });

      msg.prepend(link);
    }
    Renderer.showMessage(msg);
  },

  showMessage: function(msg) {
    $("#warning .content").append(msg);
    $("#absolute_container").slideDown('slow');
  },

  hideMessage: function(msg) {
    var imgSrc = $("#warning .img_area img").attr('src');
    if(imgSrc.match(/warning/)) {
      tweetManager.clearWarning();
    }
    $("#absolute_container").slideUp('slow');
  },

  detach: function() {
    if(!ThemeManager.detachedPos.width || !ThemeManager.detachedPos.height) {
      ThemeManager.detachedPos.width = window.innerWidth;
      ThemeManager.detachedPos.height = window.innerHeight;
    }
    window.open(chrome.extension.getURL('popup.html?detached'), 'cb_popup_window',
      'left=' + ThemeManager.detachedPos.left + ',top=' + (ThemeManager.detachedPos.top - 22) + // Magic 22...
      ',width=' + ThemeManager.detachedPos.width + ',height=' + ThemeManager.detachedPos.height +
      'location=no,menubar=no,resizable=yes,status=no,titlebar=yes,toolbar=no');
    window.close();
  }
});
