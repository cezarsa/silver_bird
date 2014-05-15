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

  expandImageLink: function (aElement, url) {
    var thumbUrl = ImageService.getThumb(url);
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
      return true;
    }

    return false;
  },

  expandLink: function (aElement, url) {
    if(this.isOnPage()) {
      return;
    }
    if(!OptionsBackend.get('show_expanded_urls')) {
      return;
    }
    if(Renderer.expandImageLink(aElement, url)) {
      return;
    }
    var $aElement = $(aElement);
    $aElement.tipsy({
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
          if($aElement.attr('original-title')) {
            $aElement.tipsy({title: 'title'});
          } else {
            $aElement.tipsy({hideNow: true});
          }
          return;
        }
        if(Renderer.expandImageLink(aElement, longUrl)) {
          return;
        }
        $aElement.tipsy({
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
        'expression': /(@(\w*)(\/\w+)?)((?=([^<])*?<a)|(?!.*?<\/a>))/i,
        'replacement':
        function() {
          var username = RegExp.$2;
          var listPath = RegExp.$3;
          var span = Renderer.makeElem("span", {});
          var link = Renderer.makeElem("a", {href: '#'});
          var linkText = username;
          if(listPath) {
            AnyClick.anyClick(link, function(event) {
              openTab(TwitterLib.URLS.BASE + username + listPath);
            });
            linkText += listPath;
          } else {
            Renderer.createUserActionMenu(link, username);
          }
          link.appendChild(Renderer.makeText(linkText));
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

  entitiesFuncs: {
    typeMap: function(type) {
      return function(e) {e.type = type; return e;};
    },
    indexSort: function(e1, e2) {
      return e1.indices[0] - e2.indices[0];
    },
    handleHashTag: function(link, value) {
      AnyClick.anyClick(link, function(ev) {
        if(Renderer.isNotification() || !OptionsBackend.get('open_searches_internally')) {
          openTab(TwitterLib.URLS.SEARCH + "%23" + value);
        } else {
          TimelineTab.addNewSearchTab('#' + value, ev.isAlternateClick);
        }
      });
    },
    handleLink: function(link, baseUrl, expandedUrl, mediaUrl) {
      var toExpandUrl = mediaUrl || expandedUrl || baseUrl;

      AnyClick.anyClick(link, function() { openTab(baseUrl); });
      link.addEventListener('mouseover', function() { Renderer.expandLink(this, toExpandUrl); }, false);
    }
  },

  parseEntities: function(text, entities) {
    var mapFunc = this.entitiesFuncs.typeMap,
        sortFunc = this.entitiesFuncs.indexSort;

    var mediaEntities = entities.media || [];

    var orderedEntities = [].concat(
        entities.hashtags.map(mapFunc('hashtag')),
        entities.urls.map(mapFunc('url')),
        entities.user_mentions.map(mapFunc('mention')),
        mediaEntities.map(mapFunc('media')));

    orderedEntities.sort(sortFunc);

    var totalInc = 0,
        elements = document.createDocumentFragment(),
        i, len, entity, indices, link, textContent;

    for (i = 0, len = orderedEntities.length; i < len; ++i) {
      entity = orderedEntities[i];
      indices = entity.indices;
      link = null;

      textContent = Transforms.transformEntities(text.substring(totalInc, indices[0]));
      elements.appendChild(Renderer.makeText(textContent));

      if (entity.type === 'mention') {

        elements.appendChild(Renderer.makeText('@'));
        link = Renderer.makeElem("a", {href: '#'}, entity.screen_name);
        Renderer.createUserActionMenu(link, entity.screen_name);

      } else if (entity.type === 'hashtag') {

        link = Renderer.makeElem("a", {href: '#'}, '#' + entity.text);
        this.entitiesFuncs.handleHashTag(link, entity.text);

      } else if (entity.type === 'url' || entity.type === "media") {

        entity.display_url = entity.display_url || entity.url;

        link = Renderer.makeElem("a", { href: entity.url }, entity.display_url);
        if (entity.display_url[entity.display_url.length - 1].charCodeAt(0) == 8230) { // Ends with ...
          link.setAttribute('title', entity.expanded_url);
        }

        this.entitiesFuncs.handleLink(link, entity.url, entity.expanded_url, entity.media_url);

      } else {

        textContent = Transforms.transformEntities(text.substring(indices[0], indices[1]));
        elements.appendChild(Renderer.makeText(textContent));

      }

      if (link) {
        elements.appendChild(link);
      }

      totalInc = indices[1];
    }

    textContent = Transforms.transformEntities(text.substring(totalInc, text.length));
    elements.appendChild(Renderer.makeText(textContent));

    return elements;
  },

  imagesFromEntities: function(entities)
  {
    if(entities == undefined)
      return;
    var elements = document.createDocumentFragment();
    entities = entities.media || [];
    for( var i=0; i < entities.length; i++ )
    {
      entity = entities[i];
      elements.appendChild( Renderer.makeElem('br'));
      var img = Renderer.makeImage( entity.media_url );
      img.setAttribute( 'style', 'width: ' + entity.sizes.small.w + 'px' );
      elements.appendChild( img );
    }
    return elements;
  },

  makeText: function (content) {
    return document.createTextNode(content);
  },

  makeSpan: function (content) {
    var span = document.createElement("span");
    span.innerText = content;
    return span;
  },

  makeElem: function(elem, attrs, content) {
    var el = document.createElement(elem);
    for (var attrName in attrs) {
      el.setAttribute(attrName, attrs[attrName]);
    }
    if(content) {
      el.innerText = content;
    }
    return el;
  },

  makeDiv: function(attrs, content) { return Renderer.makeElem("div", attrs, content); },

  makeImage: function(src, options) {
    var img = Renderer.makeElem('img', options);
    img.src = src;
    return img;
  },

  renderTweet: function (tweet, useColors, nameAttribute) {
    var user = tweet.user;
    var text = tweet.text;
    var tweetId = tweet.id;
    var entities = tweet.entities;
    if(tweet.retweeted_status) {
      user = tweet.retweeted_status.user;
      text = tweet.retweeted_status.text;
      tweetId = tweet.retweeted_status.id;
      entities = tweet.retweeted_status.entities;
    }
    var content;
    if (entities) {
      content = this.parseEntities(text, entities);
    } else {
      content = this.transformTweetText(text);
    }

    var tweetTimeline = 'home';
    if(!this.isOnPage()) {
      tweetTimeline = tweet.originalTimelineId || tweet.timelineId || tweetManager.currentTimelineId;
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
      var htmlNode = document.createElement('span');
      htmlNode.innerHTML = tweetSource;
      if(tweetSource.indexOf('&lt;') === 0) {
        // The source attribute for tweets returned by the Search API is
        // different from the regular source attribute. For search results
        // it contains a string with escaped html entities.
        htmlNode.innerHTML = htmlNode.textContent;
      }
      if(htmlNode.childNodes.length > 0) {
        var sourceHref = htmlNode.childNodes[0].href;
        if(sourceHref && sourceHref.length > 0) {
          from = Renderer.makeElem('a', {
            href: 'javacript:'
          }, htmlNode.innerText);
          AnyClick.anyClick(from, function() { openTab(sourceHref); });
        } else {
          from = Renderer.makeText(htmlNode.innerText);
        }
      }
    }
    if(tweet.geo) {
      var coords = tweet.geo.coordinates;
      if(typeof coords[0] != 'number') {
        coords[0] = 0.0;
      }
      if(typeof coords[1] != 'number') {
        coords[1] = 0.0;
      }
      var href = "http://maps.google.com/maps?q=loc:" + coords[0] + "," + coords[1] + " ";
      href += encodeURI("(" + tweet.user.screen_name + ")");

      geo = Renderer.makeElem('a', { href: '#'});
      geo.appendChild(Renderer.makeImage("data:image/gif;base64, R0lGODlhCgAKAMZZAKRFP7NDN5s5RphLU6dUTLdpVbVZbopycK1vZKNxZqxyZ79oe8hSRMVST8xdTNJaWcRlU8FlWtNzXdVpZsh5atN6aKqEe7yFfsaGa8uVe9GUf791hN55h4yGiI6FipuRkKqHhbasrbi2t8KZg8Cal8mRmuObjMehls+nn/2njvewnMO+u8m6v/ykoPCusubFvsG6wv+/yM3Ex//Lz+7Qxe/Ryf/J2f/lzf/l4f/m5//j7//t7P/47f3z8f/19f/39f/88P/59P/49v/59//69v/69/L6/Pb6/fr4+fj6+f/7+fr8+f79+//9+/z5///4//z7//37///6/v/6//n//fn+//v+//39/f/9/f///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////yH5BAEAAH8ALAAAAAAKAAoAAAdJgH+CfyUbBgs2g38gMzMcAgMugjQXLRMPDQAEgi8KEAEMDhUFgwkUEBIpGBmDFggmKhojgywHJCgkijAeIYqCMh0ivoIfK8OCgQA7"));
      AnyClick.anyClick(geo, function() { openTab(href); });
      geo.onmouseover = function() {
        Renderer.geoImage(this, coords[0], coords[1]);
      };
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
      overlayStyle = 'background-color: ' + TimelineTemplate.getTemplate(templateId).overlayColor + ';';
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

    if(OptionsBackend.get('show_photo_thumbnails')) {
      var imgDiv = Renderer.makeDiv({'class':'image'});
      imgDiv.appendChild(this.imagesFromEntities(entities));
      first_container.appendChild(imgDiv);
    }

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
    if(this.isComplete() && tweetManager.isRetweet(tweet)) {
      footer.appendChild(Renderer.makeText(chrome.i18n.getMessage("retweetedByMe") + ' '));
    }
    if(from) {
      var fromSpan = Renderer.makeElem("span", {'class':"from_app"});
      fromSpan.appendChild(Renderer.makeText(chrome.i18n.getMessage("fromApp") + ' '));
      fromSpan.appendChild(from);
      footer.appendChild(fromSpan);
    }

    if(templateId == TimelineTemplate.SENT_DMS) {
      var recipientUsername = Renderer.makeElem("a", {href: '#'});
      Renderer.createUserActionMenu(recipientUsername, tweet.recipient.screen_name);
      recipientUsername.appendChild(Renderer.makeText(tweet.recipient.name));

      var recipientSpan = Renderer.makeElem("span");
      recipientSpan.appendChild(Renderer.makeText(chrome.i18n.getMessage("sentTo") + ' '));
      recipientSpan.appendChild(recipientUsername);
      footer.appendChild(recipientSpan);
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
      if(templateId != TimelineTemplate.RECEIVED_DMS && templateId != TimelineTemplate.SENT_DMS) {
        var starImage;
        if(tweet.favorited) {
          starImage = Renderer.makeImage('img/star_hover.png', {
            'class': 'starred',
            title: chrome.i18n.getMessage("unmarkFavorite")
          });
          starImage.onclick = function() {
            Composer.unFavorite(this.parentNode.parentNode.parentNode);
          };
        } else {
          starImage = Renderer.makeImage('img/star.png', {
            'class': 'unstarred',
            title: chrome.i18n.getMessage("markFavorite")
          });
          starImage.onclick = function() {
            Composer.favorite(this.parentNode.parentNode.parentNode);
          };
        }
        actions.appendChild(starImage);
        actions.appendChild(Renderer.makeElem('br'));
      }

      if(tweet.user.screen_name == tweetManager.twitterBackend.username()) {
        var deleteImg = Renderer.makeImage('img/delete.png', {
          title: chrome.i18n.getMessage("Delete")
        });
        deleteImg.onclick = function() {
          Composer.destroy(this.parentNode.parentNode.parentNode);
        };
        actions.appendChild(deleteImg);
        actions.appendChild(Renderer.makeElem('br'));
        var confirmDeleteDiv = Renderer.makeDiv({'class': 'rt_confirm destroy'}),
            confirmDeleteConfirmLink = Renderer.makeElem('a', {href: "#"}, chrome.i18n.getMessage("Yes")),
            confirmDeleteDenyLink = Renderer.makeElem('a', {href: "#"}, chrome.i18n.getMessage("No"));

        confirmDeleteConfirmLink.onclick = Composer.confirmDestroy.bind(Composer);
        confirmDeleteDenyLink.onclick = Composer.denyDestroy.bind(Composer);

        confirmDeleteDiv.appendChild(Renderer.makeText(chrome.i18n.getMessage("deleteConfirm")));
        confirmDeleteDiv.appendChild(confirmDeleteConfirmLink);
        confirmDeleteDiv.appendChild(Renderer.makeText(' '));
        confirmDeleteDiv.appendChild(confirmDeleteDenyLink);
        actions.appendChild(confirmDeleteDiv);
      } else {
        var replyImg = Renderer.makeImage('img/reply.png', {
          title: chrome.i18n.getMessage("Reply")
        });
        replyImg.onclick = function() {
          Composer.reply(this.parentNode.parentNode.parentNode);
        };
        actions.appendChild(replyImg);
        actions.appendChild(Renderer.makeElem('br'));
        if(tweetManager.isRetweet(tweet)) {
          //TODO: undo retweet
          0;
        } else {
          if(templateId != TimelineTemplate.RECEIVED_DMS && templateId != TimelineTemplate.SENT_DMS && !user['protected']) {
            var retweetImg = Renderer.makeImage('img/rt.png', {
              title: chrome.i18n.getMessage("Retweet")
            });
            retweetImg.onclick = function() {
              Composer.retweet(this.parentNode.parentNode.parentNode);
            };
            actions.appendChild(retweetImg);
            actions.appendChild(Renderer.makeElem('br'));
            var confirmRTDiv = Renderer.makeDiv({'class': 'rt_confirm'}),
                confirmRTConfirmLink = Renderer.makeElem('a', {href: "#"}, chrome.i18n.getMessage("Yes")),
                confirmRTDenyLink = Renderer.makeElem('a', {href: "#"}, chrome.i18n.getMessage("No"));

            confirmRTConfirmLink.onclick = Composer.confirmRT.bind(Composer);
            confirmRTDenyLink.onclick = Composer.denyRT.bind(Composer);

            confirmRTDiv.appendChild(Renderer.makeText(chrome.i18n.getMessage("retweetConfirm")));
            confirmRTDiv.appendChild(confirmRTConfirmLink);
            confirmRTDiv.appendChild(Renderer.makeText(' '));
            confirmRTDiv.appendChild(confirmRTDenyLink);
            actions.appendChild(confirmRTDiv);
          }
        }
        if(!user['protected']) {
          var shareImg = Renderer.makeImage('img/share.png', {
            title: chrome.i18n.getMessage("oldRT")
          });
          shareImg.onclick = function() {
            Composer.share(this.parentNode.parentNode.parentNode);
          };
          actions.appendChild(shareImg);
          actions.appendChild(Renderer.makeElem('br'));
        }
      }
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
    var reloadTimeline = function() {
      if(tweetManager.currentTimelineId == TimelineTemplate.UNIFIED || tweetManager.currentTimelineId == TimelineTemplate.HOME) {
        prepareAndLoadTimeline();
      }
    };
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
            Composer.addUser(['@' + username]);
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
                reloadTimeline();
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
                reloadTimeline();
              }
            }, username);
          },
          condition: function() {
            var followingUsers = tweetManager.getFollowingUsersMap();
            return !$.isEmptyObject(followingUsers) && followingUsers.hasOwnProperty(username);
          },
          second_level: true
        },
        {
          name: chrome.i18n.getMessage("block_action"),
          action: function() {
            $("#loading").show();
            tweetManager.blockUser(function(success, user) {
              $("#loading").hide();
              if(success) {
                reloadTimeline();
              }
            }, username);
          },
          second_level: true
        },
        {
          name: chrome.i18n.getMessage("report_action"),
          action: function() {
            $("#loading").show();
            tweetManager.reportUser(function(success, user) {
              $("#loading").hide();
              if(success) {
                reloadTimeline();
              }
            }, username);
          },
          second_level: true
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
      var destination = $('<div id="chromed_bird_container">'),
          controlBar = $('<div id="chromed_bird_control">'),
          closeLink = $('<a id="close_trigger" href="#">');

      closeLink.bind('click', function(ev) {
        ev.preventDefault();
        destination.remove();
      });

      controlBar.append($('<span>').text('&nbsp;' + chrome.i18n.getMessage("changeNotificationSettings")));
      controlBar.append(closeLink.text("Close"));

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
    var obj =     chrome.tabs.create({
      url: tabUrl,
      selected: !background
    });
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
