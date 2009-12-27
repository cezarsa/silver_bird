function Shortener(backendId, login, apiKey) {
  if(!backendId) {
    backendId = 'bitly';
  }
  if(login && apiKey) {
    this.login = login;
    this.apiKey = apiKey;
  }
  this.shortenerInfo = SHORTENERS_BACKEND[backendId];
}
Shortener.prototype = {
  shorten: function(longUrl, callback) {
    var _this = this;
    this.shortenerInfo.backend.shorten(longUrl, this.login, this.apiKey, 
        function(errorCode, msg) {
      var cbMsg = null;
      if(errorCode == 0 && msg) {
        cbMsg = _this.shortenerInfo.baseUrl + msg;
      } else if(errorCode != 0 && msg) {
        cbMsg = 'Error ' + errorCode + ': ' + msg;
      } else {
        cbMsg = 'Unknown Error';
      }
      callback(cbMsg);
    });
  }
}

BitLyShortener = {
  shorten: function(longUrl, login, apiKey, callback) {
    var url = "http://api.bit.ly/shorten";
    var params = {
      login: 'chromedbird',
      apiKey: 'R_aa77c64a8258cf704e7fa361555a4d81',
      version: '2.0.1',
      format: 'json',
      longUrl: longUrl
    }
    if(login && apiKey) {
      params['login'] = login;
      params['apiKey'] = apiKey;
      params['history'] = 1;
    }

    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'json',
      timeout: 6000,
      success: function(data, status) {
        var ecAPI = data.errorCode;
        if(ecAPI == 0) {
          var ecURL = data.results[longUrl].errorCode;
          if(!ecURL || ecURL==0) {
            callback(0, data.results[longUrl].userHash);
          } else {
            callback(ecURL, data.results[longUrl].errorMessage);
          }
        } else {
          callback(ecAPI, data.errorMessage);
        }
      },
      error: function (request, status, error) {
        callback(-1,'AJAX request failed');
      }
    });
  }
}

TrimShortener = {
  shorten: function(longUrl, login, apiKey, callback) {
    var url = "http://api.tr.im/v1/trim_url.json";
    var params = {
      url: longUrl
    }
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'json',
      timeout: 6000,
      success: function(data, status) {
        callback(0, data.trimpath);
      },
      error: function (request, status, error) {
        callback(-1, 'AJAX request failed');
      }
    });
  }
}

SHORTENERS_BACKEND = {
  bitly: {
    desc: 'bit.ly',
    baseUrl: 'http://bit.ly/',
    backend: BitLyShortener
  },
  jmp: {
    desc: 'j.mp',
    baseUrl: 'http://j.mp/',
    backend: BitLyShortener
  },
  trim: {
    desc: 'tr.im',
    baseUrl: 'http://tr.im/',
    backend: TrimShortener
  }
}
