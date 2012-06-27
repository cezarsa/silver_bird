function getAuthPin() {
  chrome.extension.sendRequest({check_pin_needed: 1}, function(response) {
    var fullText = $("#bd").text();
    if((fullText.match(/chromed bird/i) || fullText.match(/silver bird/i)) && !fullText.match(/denied/i)) {
      var pin = $.trim($("code").text());
      if (!pin) {
        return;
      }
      if (pin.length < 6) {
        return;
      }

      var oauthMessageArea = $("#oauth_pin p");
      oauthMessageArea.css({
        '-webkit-user-select': 'text',
        'user-select': 'text',
        'cursor': 'inherit'
      });
      var message = '<h2>' + chrome.i18n.getMessage("authorizing") + "</h2><h2>" + chrome.i18n.getMessage("yourPIN", pin) + '</h2>';
      oauthMessageArea.html(message);

      var nextOpacity = 1;
      function animateLoop() {
        if(nextOpacity == 1) nextOpacity = 0.3;
        else nextOpacity = 1;
        oauthMessageArea.animate({opacity: nextOpacity}, 500, null, animateLoop);
      }
      animateLoop();

      chrome.extension.sendRequest({cr_oauth_pin: pin}, function(response) {
        var message;
        oauthMessageArea.css('opacity', 1).stop();
        if(response) {
          message = chrome.i18n.getMessage("successAuth");
        } else {
          message = chrome.i18n.getMessage("cbNotAuthorized") + " " + chrome.i18n.getMessage("yourPIN", pin);
        }
        oauthMessageArea.html('<h2>' + message + '</h2>');
      });
    }
  });
}
getAuthPin();
