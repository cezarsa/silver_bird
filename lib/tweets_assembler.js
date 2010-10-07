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

  isPopup: function() {
    return this.context == 'popup';
  },

  isNotification: function() {
    return this.context != 'popup';
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
      var minutes = parseInt(diff / 60);
      var minute_string = minutes > 1 ? "minute_plural" : "minute_singular";
      return chrome.i18n.getMessage('minutes', [minutes, chrome.i18n.getMessage(minute_string)]);
    } else if(diff < 60 * 60 * 24) {
      var hours = parseInt(diff / (60 * 60));
      var hour_string = hours > 1 ? "hour_plural" : "hour_singular";
      return chrome.i18n.getMessage("timeAgo", [hours, chrome.i18n.getMessage(hour_string)]);
    } else if(diff < 60 * 60 * 24 * 30) {
      var days = parseInt(diff / (60 * 60 * 24));
      var day_string = days > 1 ? "day_plural" : "day_singular";
      return chrome.i18n.getMessage("timeAgo", [days, chrome.i18n.getMessage(day_string)]);
    } else if(diff < 60 * 60 * 24 * 30 * 12) {
      var months = parseInt(diff / (60 * 60 * 24 * 30));
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

  geoImage: function (aElement, lat, long, name) {
    if(this.isOnPage()) {
      return;
    }
    var url = 'http://maps.google.com/maps/api/staticmap?' + $.param({
      center: lat + ',' + long,
      zoom: 14,
      size: '160x160',
      maptype: 'roadmap',
      markers: 'size:small|' + lat + ',' + long,
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
    var m = url.match(/http:\/\/(www\.)?(tweetphoto|twitpic|twitgoo|yfrog|movapic).com\/(.*)/);
    if(m) {
      var srcUrl = null;
      if(m[2] == "twitpic" || m[2] == "twitgoo") {
        srcUrl = "http://" + m[2] + ".com/show/thumb/" + m[3];
      } else if(m[2] == "yfrog") {
        srcUrl = "http://yfrog.com/" + m[3] + ".th.jpg";
      } else if(m[2] == "movapic") {
        var iid = m[3].split(/\//)[1];
        srcUrl = "http://image.movapic.com/pic/t_" + iid + ".jpeg";
      } else if(m[2] == "tweetphoto") {
        srcUrl = "http://TweetPhotoAPI.com/api/TPAPI.svc/imagefromurl?url=" + url;
      }
      if(!srcUrl) {
        return;
      }
      $(aElement).tipsy({
        title: function() {
          return '<img src="img/loading.gif" /> ' + chrome.i18n.getMessage("loadingImage");
        },
        image: srcUrl,
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

          if (scheme != null && !/^(https?|ftp)$/i.exec(scheme)) {
            // possibly dangerous scheme, suppress it
            return document.createTextNode(url);
          }

          var hrefObj = document.createElement("a");
          hrefObj.setAttribute("href", url);
          hrefObj.appendChild(document.createTextNode(url));

          ClickEmulator.handleClick(hrefObj, function() { openTab(url); });
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

          var url = TwitterLib.URLS.SEARCH + "%23" + term;
          var link = Renderer.makeElem("a", {href: url});
          link.appendChild(Renderer.makeText(label));
          ClickEmulator.handleClick(link, function() { openTab(url); });

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
          var url = TwitterLib.URLS.BASE + username;
          var span = Renderer.makeElem("span", {});
          var link = Renderer.makeElem("a", {href: url});
          ClickEmulator.handleClick(link, function() {openTab(url);});
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

  makeDiv: function(attrs) { return Renderer.makeElem("div", attrs); },

  renderTweet: function (tweet, useColors, nameAttribute) {
    var user = tweet.user;
    var text = tweet.text;
    var tweetId = tweet.id;
    if(tweet.retweeted_status) {
      user = tweet.retweeted_status.user
      text = tweet.retweeted_status.text
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
      if(tweetSource.indexOf('&lt;') == 0) {
        // The source attribute for tweets returned by the Search API is
        // different from the regular source attribute. For search results
        // it contains a string with escaped html entities.
        var htmlNode = document.createElement('div');
        htmlNode.innerHTML = tweet.source;
        tweetSource = htmlNode.textContent;
      }
      from = Renderer.makeSpan(tweetSource);
      var linkElement = from.childNodes[0];
      ClickEmulator.handleClick(linkElement, function() { openTab(linkElement.href); });
    }
    if(tweet.geo) {
      var href = "http://maps.google.com/maps?q=loc:" + tweet.geo.coordinates[0] + "," + tweet.geo.coordinates[1] + " "
      href += encodeURI("(" + tweet.user.screen_name + ")");

      var geo = Renderer.makeElem('a', {
        href: href,
        onmouseover: "Renderer.geoImage(this, " + tweet.geo.coordinates[0] + "," +  tweet.geo.coordinates[1] +  ")"
      }, "<img src=\"data:image/gif;base64, R0lGODlhCgAKAMZZAKRFP7NDN5s5RphLU6dUTLdpVbVZbopycK1vZKNxZqxyZ79oe8hSRMVST8xdTNJaWcRlU8FlWtNzXdVpZsh5atN6aKqEe7yFfsaGa8uVe9GUf791hN55h4yGiI6FipuRkKqHhbasrbi2t8KZg8Cal8mRmuObjMehls+nn/2njvewnMO+u8m6v/ykoPCusubFvsG6wv+/yM3Ex//Lz+7Qxe/Ryf/J2f/lzf/l4f/m5//j7//t7P/47f3z8f/19f/39f/88P/59P/49v/59//69v/69/L6/Pb6/fr4+fj6+f/7+fr8+f79+//9+/z5///4//z7//37///6/v/6//n//fn+//v+//39/f/9/f///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////yH5BAEAAH8ALAAAAAAKAAoAAAdJgH+CfyUbBgs2g38gMzMcAgMugjQXLRMPDQAEgi8KEAEMDhUFgwkUEBIpGBmDFggmKhojgywHJCgkijAeIYqCMh0ivoIfK8OCgQA7\" alt=\"[GEO]\"/>");
      ClickEmulator.handleClick(geo, function() { openTab(href); });
    }

    var inReply = null;
    if(tweet.in_reply_to_status_id) {
      var linkDst = TwitterLib.URLS.BASE + tweet.in_reply_to_screen_name + '/status/' + tweet.in_reply_to_status_id;
      inReply = document.createElement("a");
      inReply.setAttribute("href", linkDst);
      inReply.appendChild(Renderer.makeText(chrome.i18n.getMessage("inReply") + ' ' + tweet.in_reply_to_screen_name));
      ClickEmulator.handleClick(inReply, function() { openTab(linkDst); });
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

    var container = Renderer.makeDiv({timelineid: tweetTimeline, tweetid: tweet.id, class: tweetClass});

    var overlayStyle = '';
    if(this.isPopup() && useColors) {
      overlayStyle = 'background-color: ' + OptionsBackend.get(templateId + '_tweets_color') + ';';
    }
    var overlay = Renderer.makeDiv({class: "tweet_overlay", style: overlayStyle});
    container.appendChild(overlay);
    // Now in container -> overlay

    var first_container = Renderer.makeDiv({class:"first_container"});
    overlay.appendChild(first_container);

    var openUserProfile = function() {
      Renderer.handleUserClick(user.screen_name, TwitterLib.URLS.BASE + user.screen_name);
    };

    // now in container -> overlay -> first_container
    if(tweet.retweeted_status) {
      var img1 = Renderer.makeElem("img", {class:"profile retweet_source", src: user.profile_image_url});
      ClickEmulator.handleClick(img1, openUserProfile);
      var img2 = Renderer.makeElem('img', {class:'profile retweet_retweeter', src: tweet.user.profile_image_url});
      ClickEmulator.handleClick(img2, function() { openTab(TwitterLib.URLS.BASE + tweet.user.screen_name); });
      first_container.appendChild(img1);
      first_container.appendChild(img2);
    } else {
      var img = Renderer.makeElem("img", {class:'profile', src:user.profile_image_url});
      ClickEmulator.handleClick(img, openUserProfile);
      first_container.appendChild(img);
    }
    var userName = Renderer.makeElem("a", {href: TwitterLib.URLS.BASE + user.screen_name, class:"user", screen_name: user.screen_name, title: tweetTitleUserName});
    ClickEmulator.handleClick(userName, openUserProfile);
    userName.appendChild(Renderer.makeText(tweetUserName));
    first_container.appendChild(userName);

    if(user.verified) {
      first_container.appendChild(Renderer.makeText(" "));
      first_container.appendChild(Renderer.makeElem("img", {class:'verified', src:'img/verified.png', alt:'verified'}));
    }
    if(user.protected) {
      first_container.appendChild(Renderer.makeText(" "));
      first_container.appendChild(Renderer.makeElem("img", {class:'protected', src:'img/lock.png', alt:'protected'}));
    }

    var textDiv = Renderer.makeDiv({class:'text'});
    first_container.appendChild(textDiv);
    // now in: container -> overlay -> first_container -> textDiv
    if(tweet.retweeted_status) {
      textDiv.appendChild(Renderer.makeElem("img", {class:"retweet", src:'img/retweet.png'}));
    }

    textDiv.appendChild(content);
    // exiting textDiv, now container -> overlay -> first_container

    var footer = Renderer.makeDiv({class:'footer'});
    first_container.appendChild(footer);
    // now in container -> overlay -> footer

    var statusLinkDst = TwitterLib.URLS.BASE + user.screen_name + '/status/' + tweetId;
    var statusLinkSpan = Renderer.makeElem("span", {class:'timestamp', title: Renderer.getTimestampAltText(tweet.created_at)});
    statusLinkSpan.appendChild(Renderer.makeText(Renderer.getTimestampText(tweet.created_at)));
    var statusLink = Renderer.makeElem("a", {href:statusLinkDst});
    statusLink.appendChild(statusLinkSpan);
    ClickEmulator.handleClick(statusLink, function() {openTab(statusLinkDst);});

    footer.appendChild(statusLink);
    footer.appendChild(Renderer.makeText(" "));

    if(inReply) {
      footer.appendChild(inReply);
      footer.appendChild(Renderer.makeText(" "));
    } else if(tweet.retweeted_status) {
      footer.appendChild(Renderer.makeText(chrome.i18n.getMessage("retweetedBy") + ' '));
      var rtLink = Renderer.makeElem("a", {href:TwitterLib.URLS.BASE + tweet.user.screen_name});
      rtLink.appendChild(Renderer.makeText(tweet.user.screen_name));
      ClickEmulator.handleClick(rtLink, function() { openTab(TwitterLib.URLS.BASE + tweet.user.screen_name); });
      footer.appendChild(rtLink);
      footer.appendChild(Renderer.makeText(" "));
    }
    if(this.isPopup() && tweetManager.isRetweet(tweet.id)) {
      footer.appendChild(Renderer.makeText(chrome.i18n.getMessage("retweetedByMe") + ' '));
    }
    if(from) {
      var span = Renderer.makeElem("span", {class:"from_app"});
      span.appendChild(Renderer.makeText(chrome.i18n.getMessage("fromApp") + ' '));
      span.appendChild(from);
      footer.appendChild(span);
    }
    if (geo) {
      var span = Renderer.makeElem("span", {class:"geo_tag"});
      span.appendChild(Renderer.makeText(" "));
      span.appendChild(geo);
      footer.appendChild(span);
    }
    if(templateId == TimelineTemplate.LISTS && (this.isNotification() || tweetManager.currentTimelineId != tweetTimeline)) {
      var list = tweetManager.getList(tweetTimeline);
      if(list != null) {
        var path_ = list.uri.substr(1);
        (function(path) {
          footer.appendChild(Renderer.makeText(" (List: "));
          var link = Renderer.makeElem("a", {href:TwitterLib.URLS.BASE + path, title:"@"+path});
          ClickEmulator.handleClick(link, function() {openTab(TwitterLib.URLS.BASE + path);});
          link.appendChild(Renderer.makeText(list.name));
          footer.appendChild(link);
          footer.appendChild(Renderer.makeText(")"));
        })(path_);
      }
    }
    // exit footer, first_container, now in container -> overlay

    if(!this.isNotification()) {
      var actions = Renderer.makeDiv({class:"new_actions"});
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
          if(templateId != TimelineTemplate.DMS && !user.protected) {
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
        if(!user.protected) {
          str += '<img src="img/share.png" title="' +
          chrome.i18n.getMessage("oldRT") +
          '" onclick="Composer.share(this.parentNode.parentNode.parentNode)"></img><br>';
        }
      }
      actions.innerHTML = str;
      overlay.appendChild(actions);
    }

    overlay.appendChild(Renderer.makeDiv({style:"clear:both;"}));

    return container;
  },

  handleUserClick: function (user, url) {
    // We're gonna do different stuff depending on Composer area status
    var composeArea = $("#compose_tweet_area");
    var visible = composeArea.is(':visible');
    var button = event.button;
    if(!visible || button == 1 || event.ctrlKey) {
      // Composer not visible or Middle click or Ctrl click: Bailing out.
      openTab(url);
      return;
    }
    Composer.addUser(user);
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
      controlBar += '<a href="javascript:var el = document.getElementById(\'chromed_bird_container\'); el.parentNode.removeChild(el);">Close</a>'
      controlBar += '</div>';

      destination.append(controlBar).append(tweetsArray);
      destination.hide();
      $(document.body).prepend(destination);

      var removeElement = function() {
        destination.remove();
      }

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
}

var ClickEmulator = {
  waitingUp: [],
  init: function() {
    var _this = this;
    document.addEventListener('mouseup', function() {
      for(var i = 0, len = _this.waitingUp.length; i < len; ++i) {
        var el = _this.waitingUp[i].element;
        el.removeEventListener('mouseup', _this.waitingUp[i].listener, true);
      }
      if(len > 0) {
        _this.waitingUp = [];
      }
    }, false);
  },
  handleClick: function(el, clickCallback) {
    if(Renderer.isNotification()) {
      if(el.tagName == 'A' && el.href.charAt(el.href.length - 1) != '#') {
        return;
      }
    }
    var _this = this;
    el.addEventListener('click', function(event) {
      if(event.button != 2) {
        event.preventDefault();
      }
    }, true);
    el.addEventListener('mousedown', function() {
      var listener = function(event) {
        clickCallback(event);
      };
      _this.waitingUp.push({element: this, listener: listener});
      el.addEventListener('mouseup', listener, true);
    }, true);
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
  var obj = window.open(tabUrl, '_blank');
  if(background && obj) {
    obj.blur();
  }
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
} else {
  ClickEmulator.init();
}
