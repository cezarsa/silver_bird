function Expander() {
  this.services = null;
  this.servicesTimer = null;
  this.urlsCache = {};
  this.populateServicesCache();
}
Expander.prototype = {
  doAjaxRequest: function(path, params, successCallback, errorCallback) {
    var url = 'http://untiny.me/api/1.0/' + path + '/';
    var fullParams = $.extend({ format: 'json' }, params);
    $.ajax({
      type: 'GET',
      url: url,
      data: fullParams,
      dataType: 'json',
      success: successCallback,
      error: errorCallback
    });
  },
  populateServicesCache: function() {
    this.servicesTimer = null;
    var _this = this;
    this.doAjaxRequest('services', {},
      function success(data, status) {
        _this.services = $.extend({}, data);
      },
      function error(request, status, error) {
        // Failed to populate services list, we're going to try again
        // upon the first expand request or in a few seconds.
        _this.servicesTimer = setTimeout(function() {
          _this.populateServicesCache();
        }, 10000);
      }
    );
  },
  expand: function(url, callback) {
    if(!this.services) {
      // We don't have a services list yet, so let's try
      // to get one and send this url anyway.
      if(this.servicesTimer) {
        clearTimeout(this.servicesTimer);
      }
      this.populateServicesCache();
    }

    var longUrl = this.urlsCache[url];
    if(longUrl) {
      var isShortened = true;
      var success = true;
      callback(success, isShortened, longUrl);
      return;
    }

    if(this.services) {
      var urlDomain = url.match(/(https?:\/\/|www\.)(.*?)(\/|$)/i)[2];
      var shortenerService = this.services[urlDomain];
      if(shortenerService) {
        this.runExpander(url, callback);
      } else {
        var isShortened = false;
        var success = true;
        callback(success, isShortened, url);
      }
    } else {
      this.runExpander(url, callback);
    }
  },

  runExpander: function(url, callback) {
    var _this = this;
    this.doAjaxRequest('extract', {url: url},
      function success(data, status) {
        var success = true;
        var longUrl = data.org_url;
        var isShortened = false;
        if(url != longUrl) {
          isShortened = true;
          _this.urlsCache[url] = longUrl;
        }
        callback(success, isShortened, longUrl);
      },
      function error(request, status, error) {
        var success = false;
        var isShortened = true;
        callback(success, isShortened, '"' + error + '"(' + status + ')');
      }
    );
  }
}
