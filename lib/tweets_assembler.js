var TwitterLib = {
  URLS: {
    BASE: 'http://twitter.com/',
    SEARCH: 'http://twitter.com/search?q='
  }
};

var Renderer = {
  setContext: function(ctx) {
    this.context = ctx;
  },

  isDesktop: function() {
    return this.context == 'desktop';
  },

  isOnPage: function() {
    return this.context == 'onpage';
  },

  isComplete: function() {
    return this.context == 'popup' || this.context == 'standalone';
  },

  isStandalone: function() {
    return this.context == 'standalone';
  },

  isNotification: function() {
    return this.context == 'onpage' || this.context == 'desktop';
  },

  getTimestampText: function (inputTimestampStr) {
    var inputTimestamp = Date.parse(inputTimestampStr);
    var nowTimestamp = new Date().getTime();
    var diff = (nowTimestamp - inputTimestamp) / 1000;

    if(diff < 15) {
      return chrome.i18n.getMessage("justNow");
    } else if(diff < 60) {
      return chrome.i18n.getMessage("minuteAgo");
    } else if(diff < 60 * 60) {
      var minutes = parseInt(diff / 60, 10);
      var minute_string = minutes > 1 ? "minute_plural" : "minute_singular";
      return chrome.i18n.getMessage('minutes', [minutes, chrome.i18n.getMessage(minute_string)]);
    } else if(diff < 60 * 60 * 24) {
      var hours = parseInt(diff / (60 * 60), 10);
      var hour_string = hours > 1 ? "hour_plural" : "hour_singular";
      return chrome.i18n.getMessage("timeAgo", [hours, chrome.i18n.getMessage(hour_string)]);
    } else if(diff < 60 * 60 * 24 * 30) {
      var days = parseInt(diff / (60 * 60 * 24), 10);
      var day_string = days > 1 ? "day_plural" : "day_singular";
      return chrome.i18n.getMessage("timeAgo", [days, chrome.i18n.getMessage(day_string)]);
    } else if(diff < 60 * 60 * 24 * 30 * 12) {
      var months = parseInt(diff / (60 * 60 * 24 * 30), 10);
      var month_string = months > 1 ? "month_plural" : "month_singular";
      return chrome.i18n.getMessage("timeAgo", [months, chrome.i18n.getMessage(month_string)]);
    } else {
      return chrome.i18n.getMessage("yearsAgo");
    }
  },

  getTimestampAltText: function (inputTimestampStr) {
    var inputTimestamp = Date.parse(inputTimestampStr);
    return new Date(inputTimestamp).toLocaleDateString() + " " + new Date(inputTimestamp).toLocaleTimeString();
  },

  geoImage: function (aElement, lat, longitude, name) {
    if(this.isOnPage()) {
      return;
    }
    var url = 'http://maps.google.com/maps/api/staticmap?' + $.param({
      center: lat + ',' + longitude,
      zoom: 14,
      size: '160x160',
      maptype: 'roadmap',
      markers: 'size:small|' + lat + ',' + longitude,
      sensor: false
    });
    $(aElement).tipsy({
      title: function() {
        return '<img src="img/loading.gif" /> ' + chrome.i18n.getMessage("loadingMap");
      },
      image: url,
      html: true,
      showNow: true,
      opacity: 1.0,
      gravity: $.fn.tipsy.autoWE
    });
  },

  expandLink: function (aElement, url) {
    if(this.isOnPage()) {
      return;
    }
    if(!OptionsBackend.get('show_expanded_urls')) {
      return;
    }
    var thumbUrl = ImageServices.getThumb(url);
    if(thumbUrl) {
      $(aElement).tipsy({
        title: function() {
          return '<img src="img/loading.gif" /> ' + chrome.i18n.getMessage("loadingImage");
        },
        image: thumbUrl,
        html: true,
        showNow: true,
        opacity: 1.0,
        gravity: $.fn.tipsy.autoWE
      });
      return;
    }
    $(aElement).tipsy({
      title: function() {
        return '<img src="img/loading.gif" /> ' + chrome.i18n.getMessage("loadingLongUrl");
      },
      html: true,
      showNow: true,
      gravity: $.fn.tipsy.autoWE
    });
    urlExpander.expand(url,
      function expanded(success, isShortened, longUrl) {
        if(!isShortened) {
          $(aElement).tipsy({hideNow: true});
          return;
        }
        $(aElement).tipsy({
          title: function() {
            if(!success) {
              return chrome.i18n.getMessage("errorExpandingUrl");
            }
            return longUrl;
          },
          gravity: $.fn.tipsy.autoWE
        });
      }
    );
  },

  transformTweetText: Transforms.transformFactory([
      {
        //create links (based on John Gruber's pattern from
        //http://daringfireball.net/2009/11/liberal_regex_for_matching_urls
        //
        //I wish JavaScript had character classes
        'expression': /\b((([\w-]+):\/\/?|www[.])[^\s()<>]+((\([\w\d]+\))|([^,.;:'"`~\s]|\/)))/i,
        'replacement': function() {
          var url = RegExp.$1;
          var scheme = RegExp.$3;

          if (scheme && !(/^(https?|ftp)$/i.exec(scheme))) {
            // possibly dangerous scheme, suppress it
            return document.createTextNode(url);
          }

          var hrefObj = document.createElement("a");
          hrefObj.setAttribute("href", url);
          hrefObj.appendChild(document.createTextNode(url));

          AnyClick.anyClick(hrefObj, function() { openTab(url); });
          hrefObj.onmouseover = function() { Renderer.expandLink(this, url); };
          if (hrefObj.captureEvents) {
            hrefObj.captureEvents(CLICK);
            hrefObj.captureEvents(MOUSEOVER);
          }

          return hrefObj;
        }
      },
      {
        //create hash search links
        'expression': /([^&\w]|^)(#([\w\u0080-\uffff]*))((?=([^<])*?<a)|(?!.*?<\/a>))/i,
        'replacement': function() {
          var header = RegExp.$1;
          var label  = RegExp.$2;
          var term   = RegExp.$3;

          var link = Renderer.makeElem("a", {href: '#'});
          link.appendChild(Renderer.makeText(label));
          AnyClick.anyClick(link, function(event) {
            if(Renderer.isNotification() || !OptionsBackend.get('open_searches_internally')) {
              var url = TwitterLib.URLS.SEARCH + "%23" + term;
              openTab(url);
            } else {
              TimelineTab.addNewSearchTab('#' + term, event.isAlternateClick);
            }
          });

          var span = Renderer.makeElem("span", {});
          span.appendChild(Renderer.makeText(header));
          span.appendChild(link);

          return span;
        }
      },
      {
        //create users links
        'expression': /(@(\w*))((?=([^<])*?<a)|(?!.*?<\/a>))/i,
        'replacement':
        function() {
          var username = RegExp.$2;
          var span = Renderer.makeElem("span", {});
          var link = Renderer.makeElem("a", {href: '#'});
          Renderer.createUserActionMenu(link, username);
          link.appendChild(Renderer.makeText(username));
          span.appendChild(Renderer.makeText("@"));
          span.appendChild(link);

          return span;
        }
      },
      {
        //line breaks
        'expression': /\r?\n/,
        'replacement': function() { return document.createElement("br"); }
      }
    ]),

  makeText: function (content) {
    return document.createTextNode(content);
  },

  makeSpan: function (content) {
    var span = document.createElement("span");
    span.innerHTML = content;
    return span;
  },

  makeElem: function(elem, attrs, content) {
    var el = document.createElement(elem);
    for (var attrName in attrs) {
      el.setAttribute(attrName, attrs[attrName]);
    }
    if(content) {
      el.innerHTML = content;
    }
    return el;
  },

  makeDiv: function(attrs, content) { return Renderer.makeElem("div", attrs, content); },

  renderTweet: function (tweet, useColors, nameAttribute) {
    var user = tweet.user;
    var text = tweet.text;
    var tweetId = tweet.id;
    if(tweet.retweeted_status) {
      user = tweet.retweeted_status.user;
      text = tweet.retweeted_status.text;
      tweetId = tweet.retweeted_status.id;
    }
    var content = this.transformTweetText(text);

    var tweetTimeline = 'home';
    if(!this.isOnPage()) {
      tweetTimeline = tweet.timelineId || tweetManager.currentTimelineId;
    }
    var templateId = tweetTimeline.replace(/_.*$/, '');

    var tweetClass = 'chromed_bird_tweet tweet';
    if(!this.isNotification() && !tweetManager.isTweetRead(tweet.id)) {
      tweetClass += ' unread';
    }

    var from = null;
    var geo = null;
    if(tweet.source) {
      var tweetSource = tweet.source;
      if(tweetSource.indexOf('&lt;') === 0) {
        // The source attribute for tweets returned by the Search API is
        // different from the regular source attribute. For search results
        // it contains a string with escaped html entities.
        var htmlNode = document.createElement('div');
        htmlNode.innerHTML = tweet.source;
        tweetSource = htmlNode.textContent;
      }
      from = Renderer.makeSpan(tweetSource);
      var linkElement = from.childNodes[0];
      AnyClick.anyClick(linkElement, function() { openTab(linkElement.href); });
    }
    if(tweet.geo) {
      var href = "http://maps.google.com/maps?q=loc:" + tweet.geo.coordinates[0] + "," + tweet.geo.coordinates[1] + " ";
      href += encodeURI("(" + tweet.user.screen_name + ")");

      geo = Renderer.makeElem('a', {
        href: href,
        onmouseover: "Renderer.geoImage(this, " + tweet.geo.coordinates[0] + "," +  tweet.geo.coordinates[1] +  ")"
      }, "<img src=\"data:image/gif;base64, R0lGODlhCgAKAMZZAKRFP7NDN5s5RphLU6dUTLdpVbVZbopycK1vZKNxZqxyZ79oe8hSRMVST8xdTNJaWcRlU8FlWtNzXdVpZsh5atN6aKqEe7yFfsaGa8uVe9GUf791hN55h4yGiI6FipuRkKqHhbasrbi2t8KZg8Cal8mRmuObjMehls+nn/2njvewnMO+u8m6v/ykoPCusubFvsG6wv+/yM3Ex//Lz+7Qxe/Ryf/J2f/lzf/l4f/m5//j7//t7P/47f3z8f/19f/39f/88P/59P/49v/59//69v/69/L6/Pb6/fr4+fj6+f/7+fr8+f79+//9+/z5///4//z7//37///6/v/6//n//fn+//v+//39/f/9/f///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////yH5BAEAAH8ALAAAAAAKAAoAAAdJgH+CfyUbBgs2g38gMzMcAgMugjQXLRMPDQAEgi8KEAEMDhUFgwkUEBIpGBmDFggmKhojgywHJCgkijAeIYqCMh0ivoIfK8OCgQA7\" alt=\"[GEO]\"/>");
      AnyClick.anyClick(geo, function() { openTab(href); });
    }

    var tweetSpace = Renderer.makeDiv({'class': "tweet_space"});
    var container = Renderer.makeDiv({timelineid: tweetTimeline, tweetid: tweet.id, 'class': tweetClass});

    tweetSpace.appendChild(container);

    var inReply = null;
    if(tweet.in_reply_to_status_id) {
      var linkDst = TwitterLib.URLS.BASE + tweet.in_reply_to_screen_name + '/status/' + tweet.in_reply_to_status_id;
      inReply = document.createElement("a");
      inReply.setAttribute("href", "#");
      inReply.appendChild(Renderer.makeText(chrome.i18n.getMessage("inReply") + ' ' + tweet.in_reply_to_screen_name));
      var replyAction;
      if(this.isNotification()) {
        replyAction = function() {
          openTab(linkDst);
        };
      } else {
        replyAction = function() {
          Renderer.toggleInReply(tweet, tweetSpace);
        };
      }
      AnyClick.anyClick(inReply, replyAction);
      Renderer.expandInReply(tweet, tweetSpace, true);
    }

    var tweetUserName;
    var tweetTitleUserName;
    if(nameAttribute == "screen_name") {
      tweetUserName = user.screen_name;
      tweetTitleUserName = user.name;
    } else if(nameAttribute == "name") {
      tweetUserName = user.name;
      tweetTitleUserName = user.screen_name;
    } else if(nameAttribute == "both") {
      tweetUserName = user.screen_name + ' (' + user.name + ')';
      tweetTitleUserName = '';
    }

    var overlayStyle = '';
    if(this.isComplete() && useColors) {
      overlayStyle = 'background-color: ' + OptionsBackend.get(templateId + '_tweets_color') + ';';
    }
    var overlay = Renderer.makeDiv({'class': "tweet_overlay", style: overlayStyle});
    container.appendChild(overlay);
    // Now in container -> overlay

    var first_container = Renderer.makeDiv({'class':"first_container"});
    overlay.appendChild(first_container);

    // now in container -> overlay -> first_container
    if(tweet.retweeted_status) {
      var img1 = Renderer.makeElem("img", {'class':"profile retweet_source", src: user.profile_image_url});
      var img2 = Renderer.makeElem('img', {'class':'profile retweet_retweeter', src: tweet.user.profile_image_url});
      first_container.appendChild(img1);
      first_container.appendChild(img2);
      Renderer.createUserActionMenu(img1, user.screen_name);
      Renderer.createUserActionMenu(img2, tweet.user.screen_name);
    } else {
      var img = Renderer.makeElem("img", {'class':'profile', src:user.profile_image_url});
      first_container.appendChild(img);
      Renderer.createUserActionMenu(img, user.screen_name);
    }
    var userName = Renderer.makeElem("a", {href: '#', 'class':"user", screen_name: user.screen_name, title: tweetTitleUserName});
    Renderer.createUserActionMenu(userName, user.screen_name);
    userName.appendChild(Renderer.makeText(tweetUserName));
    first_container.appendChild(userName);

    if(user.verified) {
      first_container.appendChild(Renderer.makeText(" "));
      first_container.appendChild(Renderer.makeElem("img", {'class':'verified', src:'img/verified.png', alt:'verified'}));
    }
    if(user['protected']) {
      first_container.appendChild(Renderer.makeText(" "));
      first_container.appendChild(Renderer.makeElem("img", {'class':'protected', src:'img/lock.png', alt:'protected'}));
    }

    var textDiv = Renderer.makeDiv({'class':'text'});
    first_container.appendChild(textDiv);
    // now in: container -> overlay -> first_container -> textDiv
    if(tweet.retweeted_status) {
      textDiv.appendChild(Renderer.makeElem("img", {'class':"retweet", src:'img/retweet.png'}));
    }

    textDiv.appendChild(content);
    // exiting textDiv, now container -> overlay -> first_container

    var footer = Renderer.makeDiv({'class':'footer'});
    first_container.appendChild(footer);
    // now in container -> overlay -> footer

    var statusLinkDst = TwitterLib.URLS.BASE + user.screen_name + '/status/' + tweetId;
    var statusLinkSpan = Renderer.makeElem("span", {'class':'timestamp', title: Renderer.getTimestampAltText(tweet.created_at)});
    statusLinkSpan.appendChild(Renderer.makeText(Renderer.getTimestampText(tweet.created_at)));
    var statusLink = Renderer.makeElem("a", {href:statusLinkDst});
    statusLink.appendChild(statusLinkSpan);
    AnyClick.anyClick(statusLink, function() {openTab(statusLinkDst);});

    footer.appendChild(statusLink);
    footer.appendChild(Renderer.makeText(" "));

    if(inReply) {
      footer.appendChild(inReply);
      footer.appendChild(Renderer.makeText(" "));
    } else if(tweet.retweeted_status) {
      footer.appendChild(Renderer.makeText(chrome.i18n.getMessage("retweetedBy") + ' '));
      var rtLink = Renderer.makeElem("a", {href:TwitterLib.URLS.BASE + tweet.user.screen_name});
      rtLink.appendChild(Renderer.makeText(tweet.user.screen_name));
      AnyClick.anyClick(rtLink, function() { openTab(TwitterLib.URLS.BASE + tweet.user.screen_name); });
      footer.appendChild(rtLink);
      footer.appendChild(Renderer.makeText(" "));
    }
    if(this.isComplete() && tweetManager.isRetweet(tweet.id)) {
      footer.appendChild(Renderer.makeText(chrome.i18n.getMessage("retweetedByMe") + ' '));
    }
    if(from) {
      var fromSpan = Renderer.makeElem("span", {'class':"from_app"});
      fromSpan.appendChild(Renderer.makeText(chrome.i18n.getMessage("fromApp") + ' '));
      fromSpan.appendChild(from);
      footer.appendChild(fromSpan);
    }
    if(geo) {
      var geoSpan = Renderer.makeElem("span", {'class':"geo_tag"});
      geoSpan.appendChild(Renderer.makeText(" "));
      geoSpan.appendChild(geo);
      footer.appendChild(geoSpan);
    }
    if(templateId == TimelineTemplate.LISTS && (this.isNotification() || tweetManager.currentTimelineId != tweetTimeline)) {
      var list = tweetManager.getList(tweetTimeline);
      if(list !== null) {
        var path_ = list.uri.substr(1);
        (function(path) {
          footer.appendChild(Renderer.makeText(" (List: "));
          var link = Renderer.makeElem("a", {href:TwitterLib.URLS.BASE + path, title:"@"+path});
          AnyClick.anyClick(link, function() {openTab(TwitterLib.URLS.BASE + path);});
          link.appendChild(Renderer.makeText(list.name));
          footer.appendChild(link);
          footer.appendChild(Renderer.makeText(")"));
        })(path_);
      }
    }
    // exit footer, first_container, now in container -> overlay

    if(!this.isNotification()) {
      var actions = Renderer.makeDiv({'class':"new_actions"});
      var str = "";
      if(templateId != TimelineTemplate.DMS) {
        if(tweet.favorited) {
          str += '<img src="img/star_hover.png" title="' +
                 chrome.i18n.getMessage("unmarkFavorite") +
                 '" class="starred" onclick="Composer.unFavorite(this.parentNode.parentNode.parentNode);"></img><br>';
        } else {
          str += '<img src="img/star.png" title="' +
                 chrome.i18n.getMessage("markFavorite") +
                 '" class="unstarred" onclick="Composer.favorite(this.parentNode.parentNode.parentNode);"></img><br>';
        }
      }

      if(tweet.user.screen_name == tweetManager.twitterBackend.username()) {
        str += '<img src="img/delete.png" title="' +
               chrome.i18n.getMessage("Delete") +
               '" onclick="Composer.destroy(this.parentNode.parentNode.parentNode)"></img><br>';
        str += '<div class="rt_confirm destroy">' +
               chrome.i18n.getMessage("deleteConfirm") +
               '<a href="javascript:Composer.confirmDestroy();">' +
               chrome.i18n.getMessage("Yes") +
               '</a> <a href="javascript:Composer.denyDestroy();">' +
               chrome.i18n.getMessage("No") +
               '</a></div>';
      } else {
        str += '<img src="img/reply.png" title="' +
               chrome.i18n.getMessage("Reply") +
               '" onclick="Composer.reply(this.parentNode.parentNode.parentNode)"></img><br>';
        if(tweetManager.isRetweet(tweet.id)) {
          //TODO: undo retweet
        } else {
          if(templateId != TimelineTemplate.DMS && !user['protected']) {
            str += '<img src="img/rt.png" title="' +
            chrome.i18n.getMessage("Retweet") +
            '" onclick="Composer.retweet(this.parentNode.parentNode.parentNode)"></img><br>';
            str += '<div class="rt_confirm">' +
            chrome.i18n.getMessage("retweetConfirm") +
            '<a href="javascript:Composer.confirmRT();">' +
            chrome.i18n.getMessage("Yes") +
            '</a> <a href="javascript:Composer.denyRT();">' +
            chrome.i18n.getMessage("No") +
            '</a></div>';
          }
        }
        if(!user['protected']) {
          str += '<img src="img/share.png" title="' +
          chrome.i18n.getMessage("oldRT") +
          '" onclick="Composer.share(this.parentNode.parentNode.parentNode)"></img><br>';
        }
      }
      actions.innerHTML = str;
      overlay.appendChild(actions);
    }

    overlay.appendChild(Renderer.makeDiv({style:"clear:both;"}));

    return tweetSpace;
  },

  createUserActionMenu: function(element, username) {
    if(Renderer.isNotification()) {
      AnyClick.anyClick(element, function(event) {
        openTab(TwitterLib.URLS.BASE + username);
      });
      return;
    }
    $(element).actionMenu({
      showMenu: function(event) {
        if(event.isAlternateClick) {
          openTab(TwitterLib.URLS.BASE + username);
          return false;
        }
        return true;
      },
      actions: [
        {
          name: chrome.i18n.getMessage("tweets_action"),
          action: function(event) {
            var searchQuery = 'from:' + username;
            TimelineTab.addNewSearchTab(searchQuery, event.isAlternateClick);
          }
        },
        {
          name: chrome.i18n.getMessage("profile_action"),
          action: function() {
            openTab(TwitterLib.URLS.BASE + username);
          }
        },
        {
          name: chrome.i18n.getMessage("add_mention_action"),
          action: function() {
            Composer.addUser(username);
          },
          condition: function() {
            return $("#compose_tweet_area").is(':visible');
          }
        },
        {
          name: chrome.i18n.getMessage("follow_action"),
          action: function() {
            $("#loading").show();
            tweetManager.followUser(function(success, user) {
              $("#loading").hide();
              if(success) {
                if(tweetManager.currentTimelineId == TimelineTemplate.UNIFIED || tweetManager.currentTimelineId == TimelineTemplate.HOME) {
                  prepareAndLoadTimeline();
                }
              }
            }, username);
          },
          condition: function() {
            var followingUsers = tweetManager.getFollowingUsersMap();
            return !$.isEmptyObject(followingUsers) && !followingUsers.hasOwnProperty(username);
          }
        },
        {
          name: chrome.i18n.getMessage("unfollow_action"),
          action: function() {
            $("#loading").show();
            tweetManager.unfollowUser(function(success, user) {
              $("#loading").hide();
              if(success) {
                if(tweetManager.currentTimelineId == TimelineTemplate.UNIFIED || tweetManager.currentTimelineId == TimelineTemplate.HOME) {
                  prepareAndLoadTimeline();
                }
              }
            }, username);
          },
          condition: function() {
            var followingUsers = tweetManager.getFollowingUsersMap();
            return !$.isEmptyObject(followingUsers) && followingUsers.hasOwnProperty(username);
          }
        }
      ],
      parentContainer: '.inner_timeline'
    });
  },

  expandInReply: function(tweet, target, showIfVisible) {
    if(showIfVisible && !tweet.replyVisible) {
      return;
    }

    $("#loading").show();
    tweetManager.getInReplyToTweet(function(success, data, status) {
      if(success) {
        tweet.replyVisible = true;
        var renderedTweet = Renderer.renderTweet(data, false, OptionsBackend.get('name_attribute'));
        target.appendChild(renderedTweet);
        var separator = Renderer.makeDiv({'class': 'reply_separator'}, "\u2193");
        renderedTweet.insertBefore(separator, renderedTweet.childNodes[0]);
        separator.onclick = function() {
          Renderer.toggleInReply(tweet, target);
        };
        if(!showIfVisible) {
          $(renderedTweet).show('blind', { direction: "vertical" });
        }
      }
      $("#loading").hide();
    }, tweet);
  },

  toggleInReply: function(tweet, target) {
    if(tweet.replyVisible) {
      tweet.replyVisible = false;
      var tweetSpace = $("div.tweet[tweetid='" + tweet.in_reply_to_status_id + "']", target).parents('.tweet_space');
      tweetSpace.first().hide('blind', { direction: "vertical" }, 'normal', function() {
        $(this).remove();
      });
      return;
    }

    Renderer.expandInReply(tweet, target);
  },

  assemblyTweetsOnPage: function (tweets, nameAttribute, fadeTimeout) {
    var tweetsArray = [];
    for(var i = 0; i < tweets.length; ++i) {
      tweetsArray[i] = Renderer.renderTweet(tweets[i], false, nameAttribute);
    }

    var existingDestination = $("#chromed_bird_container");
    if(existingDestination.length == 1) {
      existingDestination.append(tweetsArray);
    } else {
      var destination = $("<div id='chromed_bird_container'>");

      var controlBar = '<div id="chromed_bird_control">';
      controlBar += '&nbsp;' + chrome.i18n.getMessage("changeNotificationSettings");
      controlBar += '<a href="javascript:var el = document.getElementById(\'chromed_bird_container\'); el.parentNode.removeChild(el);">Close</a>';
      controlBar += '</div>';

      destination.append(controlBar).append(tweetsArray);
      destination.hide();
      $(document.body).prepend(destination);

      var removeElement = function() {
        destination.remove();
      };

      destination.slideDown('fast', function(){
        $(this).fadeOut(fadeTimeout, removeElement).hover(
          function() {
            $(this).stop().show().css('opacity', '1.0');
          },
          function() {
            $(this).fadeOut(fadeTimeout, removeElement);
          }
        );
      });
    }
  }
};

function openTab(tabUrl) {
  var background = false;
  if(event) {
    if(event.button == 2) {
      return true;
    }
    if(event.button == 1 || event.metaKey || event.ctrlKey) {
      background = true;
    }
  }
  if(tabUrl.match(/^www/i)) {
    tabUrl = "http://" + tabUrl;
  }
  if(!background || Renderer.isNotification()) {
    var obj = window.open(tabUrl, '_blank');
    if(background && obj) {
      obj.blur();
    }
  } else {
    chrome.tabs.create({
      url: tabUrl,
      selected: !background
    });
  }
  return true;
}

if(location.protocol != 'chrome-extension:' && document.body.tagName != 'FRAMESET') {
  chrome.extension.sendRequest({
    cb_requesting_tweets: true,
    frame_area: $(window).width() * $(window).height()
  }, function(response) {
    var tweets = response.tweets;
    if(tweets && tweets.length > 0) {
      Renderer.setContext('onpage');
      Renderer.assemblyTweetsOnPage(tweets, response.nameAttribute, response.fadeTimeout);
    }
  });
}
