$.ajaxSetup({
  timeout: OptionsBackend.get('request_timeout')
});

var url_shortener = OptionsBackend.get('url_shortener');
var shortener_acct = OptionsBackend.get('shortener_acct');
var shortener_login = null;
var shortener_key = null;
if(shortener_acct) {
  shortener_login = OptionsBackend.get('shortener_login');
  shortener_key = OptionsBackend.get('shortener_key');
}

if (url_shortener == 'yourls'){
  shortener_key = OptionsBackend.get('yourls_key');
} else if( url_shortener == 'googl' ){
  shortener_acct = OptionsBackend.get('shortener_oauth');
}

var reply_all = OptionsBackend.get('reply_all');
var shortener = new Shortener(url_shortener, shortener_acct, 
                  shortener_login, shortener_key, 
                  OptionsBackend.get('shortener_service_url'));

$.extend($.ui.tabs.prototype, {
  refreshPositions: function() {
    return this._tabify();
  }
});

$.fn.hoverFor = function(time, mainCallback, startingCallback, abortCallback) {
  return this.each(function(){
    var _this = this, timeoutHandle, triggerFired = false;
    $(this).hover(
      function() {
        if(triggerFired)
          return;
        if(startingCallback)
          startingCallback.call(_this);
        timeoutHandle = setTimeout(function() {
          triggerFired = true;
          mainCallback.call(_this);
          timeoutHandle = null;
        }, time);
      },
      function() {
        if(triggerFired)
          return;
        if(timeoutHandle) {
          if(abortCallback)
            abortCallback.call(_this);
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
      }
    );
 });
};
