function Expander() {
  this.services = null;
  this.servicesTimer = null;
  this.urlsCache = {};
  this.retryTimeout = 10000;
  this.populateServicesCache();
  this.currentServiceIdx = 0;
}
Expander.servicesArray = ['untiny', 'longshore'];
Expander.services = {
  untiny: {
    expand: function(url) {
      return ['http://untiny.me/api/1.0/extract/', {url: url, format: 'json', apiKey: 'cfba0bb3e37778459d1fd245b5c6c7890f3167a6'}];
    },
    services: function() {
      return ['http://untiny.me/api/1.0/services/', {format: 'json', apiKey: 'cfba0bb3e37778459d1fd245b5c6c7890f3167a6'}];
    },
    parseServices: function(services, data) {
      if(!services) {
        services = {};
      }
      for(var domain in data) {
        if(!services[domain]) {
          services[domain] = {};
        }
        services[domain].untiny = true;
      }
      return services;
    },
    parseExpand: function(data) {
      return data.org_url;
    }
  },
  longshore: {
    expand: function(url) {
      return ['http://long-shore.com/api/expand/format/json', {url: url}];
    },
    services: function() {
      return ['http://long-shore.com/api/services/format/json', {}];
    },
    parseServices: function(services, data) {
      if(!services) {
        services = {};
      }
      for(var i = 0; i < data.length; ++i) {
        var domain = data[i].domain;
        if(!services[domain]) {
          services[domain] = {};
        }
        services[domain].longshore = true;
        services[domain].regexp = data[i].regexp;
      }
      return services;
    },
    parseExpand: function(data) {
      return data.long_url;
    }
  }
};

Expander.prototype = {
  doAjaxRequest: function(url, params, successCallback, errorCallback) {
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'json',
      success: successCallback,
      error: errorCallback
    });
  },

  populateServicesCache: function() {
    for(var service in Expander.services) {
      this.updateServicesCache(Expander.services[service]);
    }
  },

  updateServicesCache: function(service) {
    this.servicesTimer = null;
    var _this = this;
    var result = service.services();
    var url = result[0], params = result[1];
    this.doAjaxRequest(url, params,
      function success(data, status) {
        if(!data) {
          return;
        }
        _this.services = service.parseServices(_this.services, data);
      },
      function error(request, status, error) {
        // Failed to populate services list, we're going to try again
        // upon the first expand request or in a few seconds.
        _this.servicesTimer = setTimeout(function() {
          _this.updateServicesCache(service);
        }, _this.retryTimeout);
        _this.retryTimeout = _this.retryTimeout * 2;
      }
    );
  },

  expand: function(url, callback) {
    var longUrl = this.urlsCache[url];
    var isShortened = true;
    var success = true;
    if(longUrl) {
      callback(success, isShortened, longUrl);
      return;
    }

    if(this.services) {
      var urlDomain = url.match(/(https?:\/\/|www\.)(.*?)(\/|$)/i)[2];
      var shortenerService = this.services[urlDomain];
      if(shortenerService) {
        while(true) {
          var serviceName = this.getCurrentService();
          if(shortenerService[serviceName]) {
            this.runExpander(Expander.services[serviceName], url, callback);
            break;
          }
        }
      } else {
        isShortened = false;
        success = true;
        callback(success, isShortened, url);
      }
    } else {
      callback(true, false);
    }
  },

  getCurrentService: function() {
    var chosenService = Expander.servicesArray[this.currentServiceIdx];
    this.currentServiceIdx += 1;
    this.currentServiceIdx = this.currentServiceIdx % Expander.servicesArray.length;
    return chosenService;
  },

  runExpander: function(service, shortUrl, callback) {
    var _this = this;
    var result = service.expand(shortUrl);
    var url = result[0], params = result[1];
    this.doAjaxRequest(url, params,
      function success(data, status) {
        var success = false;
        var isShortened = true;
        if(data) {
          success = true;
          var longUrl = service.parseExpand(data);
          if(shortUrl == longUrl) {
            isShortened = false;
          } else {
            _this.urlsCache[shortUrl] = longUrl;
          }
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
};
