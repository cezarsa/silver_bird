var LocaleTable = chrome.extension.getBackgroundPage().LocaleTable;
var ImageService = chrome.extension.getBackgroundPage().ImageService;
var IconCreator = chrome.extension.getBackgroundPage().IconCreator;
var tweetManager = chrome.extension.getBackgroundPage().TweetManager.instance;

chrome.i18n.getMessage = chrome.extension.getBackgroundPage().chrome.i18n.getMessage;

var twitterBackend = tweetManager.twitterBackend;
var options = new Options();
var imgEl = null;

function paintIcon(canvas, color) {
  if(!imgEl) {
    var img = $('<img>').attr('src', 'img/icon19.png');
    img.load(function() {
      imgEl = img[0];
      var imgData = IconCreator.paintIcon(imgEl, color);
      canvas.getContext("2d").putImageData(imgData, 0, 0);
    });
  } else {
    var imgData = IconCreator.paintIcon(imgEl, color);
    canvas.getContext("2d").putImageData(imgData, 0, 0);
  }
}


function bindEvents() {
  $("#Yes").bind('click', function() {
    options.confirmRestart();
  });

  $("#No").bind('click', function() {
    options.denyRestart();
  });

  $("#btn_reset_popup_size").bind('click', function() {
    Persistence.popupSize().remove();
  });

  $("#btn_save").bind('click', function() {
    options.save();
  });

  $("#btn_reset").bind('click', function() {
    options.load();
  });

  $("#btn_default").bind('click', function() {
    options.loadDefaults();
  });
}


var hourlyLimit = 150;
$(function() {
  bindEvents();

  $("input.i18n").each(function() {
    $(this).val(chrome.i18n.getMessage(this.id));
  });

  $(".i18n").not("input .htmlSafe").each(function() {
    $(this).text(chrome.i18n.getMessage(this.id));
  });

  $(".i18n.htmlSafe").each(function() {
    $(this).html(chrome.i18n.getMessage(this.id));
  });

  var resetDateObj = new Date();
  if(twitterBackend) {
    var hitsInfo = twitterBackend.remainingHitsInfo();
    $(".twitter_hits_left").text(hitsInfo[0]);

    resetDateObj.setTime(parseInt(hitsInfo[1], 10) * 1000);
    $(".twitter_hits_reset").text(resetDateObj.toLocaleDateString() + " " + resetDateObj.toLocaleTimeString());

    if(hitsInfo[2]) {
      hourlyLimit = parseInt(hitsInfo[2], 10);
    }
  }
  $(".__hourly_limit").text(hourlyLimit);

  $("select[name='default_locale']").append($("<option>").attr('value', 'auto').text(chrome.i18n.getMessage('automatic')));
  for(var localeCode in LocaleTable.instance.locales) {
    $("select[name='default_locale']").append($("<option>").attr('value', localeCode).text(localeCode));
  }

  for(var key in SHORTENERS_BACKEND) {
    var desc = SHORTENERS_BACKEND[key].desc;
    $("select[name='url_shortener']").append($("<option>").attr('value', key).text(desc));
  }

  for(var i = 0, len = ImageService.services.length; i < len; ++i) {
    var service = ImageService.services[i];
    if(service.hasUpload()) {
      $("select[name='image_upload_service']").append($("<option>").attr('value', service.domain).text(service.domain));
    }
  }

  var onShortenerChange = function() {
    $("#shortener_opts").hide();
    $("#yourls_opts").hide();
    $("#googl_opts").hide();
    var shortenerSelect = $("select[name='url_shortener']")[0];
    if(shortenerSelect.value == 'bitly' || shortenerSelect.value == 'jmp' || shortenerSelect.value == 'karmacracy') {
      $("#shortener_opts").show();
    } else if(shortenerSelect.value == 'yourls') {
      $("#yourls_opts").show();
    } else if(shortenerSelect.value == 'googl') {
      $("#googl_opts").show();
    }
  };

  var onShortenerAcctClick = function() {
    if($("input[name='shortener_acct']").is(':checked')) {
      $("input[name='shortener_login']").removeAttr('disabled');
      $("input[name='shortener_key']").removeAttr('disabled');
    } else {
      $("input[name='shortener_login']").val('').attr('disabled', 'disabled');
      $("input[name='shortener_key']").val('').attr('disabled', 'disabled');
    }
  };
  $("select[name='url_shortener']").change(onShortenerChange);
  $("input[name='shortener_acct']").click(onShortenerAcctClick);

  var onSigningUrlCheck = function() {
    var $check = $("input[name='same_signing_urls']");
    if($check.is(':checked')) {
      $("input[name='base_signing_url'], input[name='base_oauth_signing_url']").attr('disabled', 'disabled');
      $("input[name='base_signing_url']").val($("input[name='base_url']").val());
      $("input[name='base_oauth_signing_url']").val($("input[name='base_oauth_url']").val());

      $("input[name='base_url']").bind('keyup blur', function() {
        $("input[name='base_signing_url']").val($(this).val());
      });
      $("input[name='base_oauth_url']").bind('keyup blur', function() {
        $("input[name='base_oauth_signing_url']").val($(this).val());
      });
    } else {
      $("input[name='base_signing_url'], input[name='base_oauth_signing_url']").removeAttr('disabled');

      $("input[name='base_url']").unbind('keyup blur');
      $("input[name='base_oauth_url']").unbind('keyup blur');
    }
  };
  $("input[name='same_signing_urls']").click(onSigningUrlCheck);

  $('canvas.color_selector').ColorPicker({
    onChange: function (hsb, hex, rgb, rgbaStr) {
      var canvas = this.data('colorpicker').el;
      $(canvas).attr('strColor', rgbaStr);
      paintIcon(canvas, rgb);
    }
  });
  $('div.color_selector').ColorPicker({
    onChange: function (hsb, hex, rgb, rgbaStr) {
      var div = this.data('colorpicker').el;
      $(div).attr('strColor', rgbaStr);
      $(div).css('backgroundColor', rgbaStr);
    }
  });
  options.onload(function() {
    onShortenerChange();
    onShortenerAcctClick();
    onSigningUrlCheck();
  });
  options.onsaveChangedOption(function(optionName, oldValue, newValue) {
    var idx, templateId;
    if((idx = optionName.indexOf('_visible')) != -1) {
      templateId = optionName.substring(0, idx);
      if(newValue) {
        tweetManager.showTimelineTemplate(templateId, true);
      } else {
        tweetManager.hideTimelineTemplate(templateId);
      }
    } else if((idx = optionName.indexOf('_include_unified')) != -1) {
      templateId = optionName.substring(0, idx);
      tweetManager.toggleUnified(templateId, newValue);
    } else if(optionName == 'trending_topics_woeid') {
      tweetManager.cachedTrendingTopics = null;
    }
  });
  options.onsave(function() {
    if($("#noti_desktop").is(":checked")) {
      try {
        var notificationCenter = window.notifications || window.webkitNotifications;
        if(!notificationCenter) {
          throw 'out';
        }
        var authStatus = notificationCenter.checkPermission();
        if(authStatus == 1 || authStatus == 2) { // Not allowed or Denied
          notificationCenter.requestPermission(function() {
            var authStatus = notificationCenter.checkPermission();
            if(authStatus !== 0) { // Permission denied
              $("#noti_on_page").click();
              options.save();
            }
          });
        }
      } catch(boom) {
        $("#noti_on_page").click();
        options.save();
      }
    }
  });
  options.load();

  var createTTSelect = function(ttLocales) {
    $("select[name='trending_topics_woeid']").empty();
    $.each(ttLocales, function(i, locale){
      $("select[name='trending_topics_woeid']").append($("<option>").attr('value', locale.woeid).text(locale.name));
    });
    $("select[name='trending_topics_woeid']").val(OptionsBackend.get('trending_topics_woeid'));
  };
  var woeids = tweetManager.retrieveTrendingRegions(function(woeids) {
    createTTSelect(woeids);
  });
  createTTSelect(woeids);

  updatePredictedHitsCount();
  $('table.timelines input, table.timelines select').
    keyup(updatePredictedHitsCount).
    blur(updatePredictedHitsCount).
    click(updatePredictedHitsCount).
    change(updatePredictedHitsCount);

  $("input[name='microblogging_service'],label[for='service_twitter'],label[for='service_identica']").mousedown(function(e) {
    var el = $(e.target);
    if(el.is('label')) {
      el = $('#' + el.attr('for'));
    }
    if(!el.is(':checked')) {
      var proceed = confirm("This will reset any custom API URL configuration. Proceed?");
      if(proceed) {
        el.click();
        var sameSigningEl = $("input[name='same_signing_urls']");
        var baseUrlEl = $("input[name='base_url']");
        var baseOauthUrlEl = $("input[name='base_oauth_url']");

        if(el.val() == 'twitter') {
          baseUrlEl.val('http://api.twitter.com/1/');
          baseOauthUrlEl.val('https://twitter.com/oauth/');
        } else if(el.val() == 'identica') {
          baseUrlEl.val('http://identi.ca/api/');
          baseOauthUrlEl.val('https://identi.ca/api/oauth/');
        }
        baseUrlEl.blur();
        baseOauthUrlEl.blur();
        if(!sameSigningEl.is(':checked')) {
          sameSigningEl.attr('checked', true).click().attr('checked', true);
        }
      }
    }
    return true;
  });

  $("#nerds_link").click(function() {
    var $canvas = $("#nerds");
    $canvas.toggle();
    if($canvas.is(":visible")) {
      var points = chrome.extension.getBackgroundPage().TweetManager.instance.apiHitsStates;
      Math.generateTendencyGraph($canvas[0], points, resetDateObj.getTime());
    }
  });
});

function updatePredictedHitsCount() {
  var totalHits = 0;
  var unifiedVisible = $('input[name="unified_visible"]').is(':checked');

  TimelineTemplate.eachTimelineTemplate(function(template) {
    if(template.id == TimelineTemplate.UNIFIED) {
      return true;
    }
    var inputUnifiedEl = $('input[name="' +  template.id + '_include_unified"]');
    if(!unifiedVisible) {
      inputUnifiedEl.attr('disabled', 'disabled');
    } else {
      inputUnifiedEl.removeAttr('disabled');
    }
    if(template.id == TimelineTemplate.SEARCH) {
      return true;
    }
    var inputVisibleEl = $('input[name="' +  template.id + '_visible"]');
    if(!inputVisibleEl.is(':checked') && !(unifiedVisible && inputUnifiedEl.is(':checked'))) {
      return true;
    }

    var inputRefreshEl = $('input[name="' +  template.id + '_refresh_interval"]');
    var intVal = parseInt(inputRefreshEl.val(), 10);
    var timelineHits = (60 * 60) / intVal;
    var timelineCount = 1;
    if(template.id == TimelineTemplate.DMS) {
      timelineCount = 2;
    } else {
      var userData = template.getUserData();
      if(userData && userData.length > 0) {
        timelineCount = userData.length;
      }
    }

    totalHits += timelineHits * timelineCount;
    return true;
  });
  totalHits += (60 * 60) / parseInt($('input[name="blockedusers_refresh_interval"]').val(), 10);
  totalHits = parseInt(totalHits, 10);
  $('#predicted_hits_count').text(totalHits);
  if(totalHits >= hourlyLimit) {
    $('#predicted_hits_count').css('backgroundColor', 'red');
  } else if(totalHits >= hourlyLimit * 0.85) {
    $('#predicted_hits_count').css('backgroundColor', 'yellow');
  } else {
    $('#predicted_hits_count').css('backgroundColor', 'white');
  }
  return totalHits;
}
