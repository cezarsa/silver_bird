function getAuthPin() {
  var fullText = $("div.message-content:not(.new_div)").text();
  if(fullText.match(/chromed bird/i) && !fullText.match(/denied/i)) {
    var pin = $.trim($("#oauth_pin").text());
    $("div.message-content").hide();
    var newDiv = $("<div class='message-content new_div'>")
      .html("<h2>Please wait, authorizing Chromed Bird...</h2>Your PIN number is: " +  pin)
      .insertAfter("div.message-content");

    var nextOpacity = 1;
    function animateLoop() {
      if(nextOpacity == 1) nextOpacity = 0.3;
      else nextOpacity = 1;
      $("div.message-content.new_div").animate({opacity: nextOpacity}, 500, null, animateLoop);
    }
    animateLoop();

    chrome.extension.sendRequest({cr_oauth_pin: pin}, function(response) {
      $("div.message-content.new_div").css('opacity', 1);
      $("div.message-content.new_div").stop();
      if(response) {
        $("div.message-content.new_div").html(
          "<h2>Congratulations, you've been successfully authenticated. Enjoy Chromed Bird!</h2><div id='oauth_pin' style='font-size: 2.5em;'>Chromed Bird authorized!</div>");
      } else {
        $("div.message-content.new_div").html("<h2>Oops... Something went wrong. Please, try clicking Chromed Bird icon again.</h2>");
      }
    });
  }
}
getAuthPin();
