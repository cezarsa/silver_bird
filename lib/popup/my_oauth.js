var myOAuth = {
  registerPin: function() {
    var pinNumber = $("input[name='pin']").val();
    $("#loading_oauth").show();
    twitterBackend.oauthLib.getAccessToken(pinNumber, function(result) {
      $("#loading_oauth").hide();
      $("#enter_pin").hide();
      if(result) {
        initializeWorkspace();
      } else {
        var errMsg = twitterBackend.oauthLib.error;
        $("#error_pin").show().html(chrome.i18n.getMessage("oAuthError", errMsg));
      }
    });
  },
  requestNewToken: function() {
    twitterBackend.startAuthentication();
    window.close();
  }
};
