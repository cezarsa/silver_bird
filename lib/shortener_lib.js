var tweetManager = chrome.extension.getBackgroundPage().TweetManager.instance;

function Shortener(backendId, useAcct, login, apiKey, serviceUrl) {
  if(!backendId) {
    backendId = 'bitly';
  }
  this.useAcct = useAcct;
  if(useAcct || backendId == 'yourls') {
    this.login = login;
    this.apiKey = apiKey;
  }
  this.serviceUrl = serviceUrl;
  this.shortenerInfo = SHORTENERS_BACKEND[backendId];
}
Shortener.prototype = {
  shorten: function(longUrl, callback) {
    var _this = this;
      this.shortenerInfo.backend.shorten(longUrl, this.useAcct, this.login, this.apiKey, this.serviceUrl,
        function(errorCode, msg) {
      var cbMsg = null;
      var success = true;
      if(errorCode === 0 && msg) {
        cbMsg = '';
        if(_this.shortenerInfo.baseUrl) {
          cbMsg += _this.shortenerInfo.baseUrl;
          msg = msg.replace(/^.*\//g, '');
        }
        cbMsg += msg;
      } else if(errorCode !== 0 && msg) {
        cbMsg = 'Error ' + errorCode + ': ' + msg;
        success = false;
      } else {
        cbMsg = 'Unknown Error';
        success = false;
      }
      callback(success, cbMsg);
    });
  }
};

BitLyShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://api.bit.ly/v3/shorten";
    var params = {
      format: 'json',
      longUrl: longUrl,
      login: 'chromedbird',
      apiKey: 'R_aa77c64a8258cf704e7fa361555a4d81'
    };
    if(useAcct) {
      params['x_login'] = login;
      params['x_apiKey'] = apiKey;
    }

    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'json',
      success: function(data, status_param) {
        var status = data.status_code;
        if(status == 200) {
          callback(0, data.data.url);
        } else {
          callback(status, data.status_txt);
        }
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

TrimShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://api.tr.im/v1/trim_url.json";
    var params = {
      url: longUrl
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'json',
      success: function(data, status) {
        if(data.status.result != 'OK') {
          callback(data.status.code, data.status.message);
          return;
        }
        callback(0, data.trimpath);
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

MigremeShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://migre.me/api.json";
    var params = {
      url: longUrl
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'json',
      success: function(data, status) {
        if(!data.id) {
          callback(-1, data.info);
          return;
        }
        callback(0, data.id);
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

IsGdShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://is.gd/api.php";
    var params = {
      longurl: longUrl
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'text',
      success: function(data, status) {
        if(data.match(/^ERROR/i)) {
          callback(-1, data);
          return;
        }
        callback(0, data);
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

MiudinShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://miud.in/api-create.php";
    var params = {
      url: longUrl
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'text',
      success: function(data, status) {
        callback(0, data);
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

UdanaxShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://udanax.org/shorturl.jsp";
    var params = {
      mode: 'api',
      longurl: longUrl
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      jsonp: 'jsoncallback',
      dataType: 'jsonp',
      success: function(data, status) {
        callback(0, data.shorturl);
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

URLinlShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://urli.nl/api.php";
    var params = {
      format: 'json',
      action: 'shorturl',
      url: longUrl
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'json',
      success: function(data, status) {
        if(data && data.status && data.status == 'success') {
          callback(0, data.url.keyword);
        } else {
          callback(data.statusCode, data.message);
        }
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

URLcortaShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://urlcorta.es/api/text/";
    var params = {
      url: longUrl
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'text',
      success: function(data, status) {
        callback(0, data);
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

GooglShortener = {
  Url: 'https://www.googleapis.com/urlshortener/v1/url',
  ApiKey: 'AIzaSyB9U81fmI8VatuVppMgujql4pju6RWui9Y',
  
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    if( useAcct && tweetManager.shortenerAuth.token == null ) {
      this.oauthGetRequestToken(longUrl, callback);
      return;
    }
    this.sendRequest( longUrl, useAcct, callback );
  },
  sendRequest: function( longUrl, signRequest, callback) {
    var _this = this;
    var url = this.Url + ( (signRequest==true)?'': ('?key=' + this.ApiKey) );
    var beforeSendCb = function( req, settings ) {
      if( signRequest ) {
        _this.insertAuthorizationHeader( req, url, [], 'POST' );
      }
    };

    $.ajax({
      url: url,
      type: 'POST',
      data: '{ "longUrl" : "' + longUrl + '"}',
      contentType: 'application/json',
      beforeSend: beforeSendCb,
      success: function(data, status) {
        callback(0, data.id);
      },
      error: function (request, status, error) {
        var fmtError = ' Error: ' + request.statusText;
        if( signRequest && request.status == 401 ) //Our token probably got revoked. (401 - Unauthorized)
          _this.oauthGetRequestToken(longUrl, callback);
        else
        callback(-1, fmtError);
      }
    });
  },
  oauthGetRequestToken: function(longUrl, callback){
    tweetManager.shortenerAuth.token = this.oauth_acessor.token = null;
    tweetManager.shortenerAuth.tokenSecret = this.oauth_acessor.tokenSecret = '';
    tweetManager.shortenerAuth.longUrl = longUrl;
    tweetManager.shortenerAuth.callback = callback;
    OptionsBackend.saveOption( 'shortener_token', this.oauth_acessor.token );
    OptionsBackend.saveOption( 'shortener_token_secret', this.oauth_acessor.tokenSecret );       
    var message = {
      action: 'https://www.google.com/accounts/OAuthGetRequestToken',
      method: 'GET',
      parameters: [
        ['scope', 'https://www.googleapis.com/auth/urlshortener'],
        ['xoauth_displayname', 'Silver Bird'],
        ['oauth_callback', chrome.extension.getURL('oauth_callback.html') ],
      ]
    };
    var _this = this;
    var success = function(data, status) {
      var paramMap = OAuth.getParameterMap(data);
      tweetManager.shortenerAuth.token = _this.oauth_acessor.token = paramMap['oauth_token'];
      tweetManager.shortenerAuth.tokenSecret = _this.oauth_acessor.tokenSecret = paramMap['oauth_token_secret'];
      _this.oauthAuthorizeToken();
    };
    var error = function(request, status, error) {
      tweetManager.shortenerAuth.callback(-1, 'Error Get Request Token: ' + 
        request.statusText + '(' + request.responseText + ')' );
    };
    this.sendOAuthRequest( message, success, error );
  },
  oauthAuthorizeToken: function() {
    chrome.tabs.create({
      "url": 'https://www.google.com/accounts/OAuthAuthorizeToken?oauth_token=' + this.oauth_acessor.token,
      "selected": true
    });
    tweetManager.shortenerAuth.tokenRequested = true;
  },
  getAccessToken: function( searchString ) {
    var params = OAuth.decodeForm(searchString.substr(1));
    this.oauth_acessor.token = OAuth.getParameter(params,'oauth_token');
    tweetManager.shortenerAuth.tokenRequested = false;
    var message = {
      action: 'https://www.google.com/accounts/OAuthGetAccessToken',
      method: 'GET',
      parameters: [['oauth_verifier', OAuth.getParameter(params,'oauth_verifier') ]],
    };
    var _this = this;
    var success = function(data, status) {
        var paramMap = OAuth.getParameterMap(data);
        tweetManager.shortenerAuth.token = _this.oauth_acessor.token = paramMap['oauth_token'];
        tweetManager.shortenerAuth.tokenSecret = _this.oauth_acessor.tokenSecret = paramMap['oauth_token_secret'];
        OptionsBackend.saveOption( 'shortener_token', _this.oauth_acessor.token );
        OptionsBackend.saveOption( 'shortener_token_secret', _this.oauth_acessor.tokenSecret );
        
        //Now that we have the token, make the proper request.
        _this.sendRequest( tweetManager.shortenerAuth.longUrl, true, tweetManager.shortenerAuth.callback );
        
        $('.debugme').append( '<br/>Authorization OK, completing request and closing tab...');
        setTimeout(function() {
          chrome.tabs.getSelected(null, function (tab) { chrome.tabs.remove(tab.id); }); 
        }, 1000 );        
    };
    var error = function( request, status, error ) {
        $('.debugme').append( '<br/>error access token: ' + '"' + request.responseText + '"(' + request.statusText + ')' );
        $('.debugme').append( '<br/>status= ' + status + ' error= ' + error );
    };
    this.sendOAuthRequest(message, success, error);
  },
  signOAuthRequest: function(message) {
    var parm= [['oauth_signature_method', 'HMAC-SHA1']];
    message.parameters.concat( parm );
    OAuth.completeRequest(message, this.oauth_acessor);
    return OAuth.getParameterMap(message.parameters);
  },
  sendOAuthRequest: function( message, successCb, errorCb ) {
    $.ajax({
      type: message.method,
      url: message.action,
      data: this.signOAuthRequest( message ),
      success: function(data, status) {
        successCb( data, status );
      },
      error: function( request, status, error) {
        errorCb( request, status, error );
      }
    });    
  },

  //directly copied from twitter_lib.js
  generateOauthHeader: function(signedData) {
    var authorization = 'OAuth ';
    authorization += 'oauth_consumer_key="' + signedData.oauth_consumer_key + '", ' +
    'oauth_signature_method="HMAC-SHA1", ' +
    'oauth_token="' + signedData.oauth_token + '", ' +
    'oauth_timestamp="' + signedData.oauth_timestamp + '", ' +
    'oauth_nonce="' + encodeURIComponent(signedData.oauth_nonce) + '", ' +
    'oauth_version="1.0", ' +
    'oauth_signature="' + encodeURIComponent(signedData.oauth_signature) + '"';

    return authorization;
  },
  //directly copied from twitter_lib.js
  insertAuthorizationHeader: function(xhr, url, params, method) {
    var msg = {
      method: method,
      action: url,
      parameters: params
    };
    var signedData = this.signOAuthRequest(msg);
    xhr.setRequestHeader('Authorization', this.generateOauthHeader(signedData));
  },
  
  oauth_acessor: {
    consumerKey: '382562475363-qsi00p0qe7s0tcdn9e4hnrnf1vm23n02.apps.googleusercontent.com',//'382562475363.apps.googleusercontent.com',
    consumerSecret: 'z0jOCqD296G52ULnpVrTrNKv',//'Nu1+wMezpSmF/KWLKEVyt7hy',
    tokenSecret: tweetManager.shortenerAuth.tokenSecret,
    token: tweetManager.shortenerAuth.token,
  }
};

KCYShortener = {
  shorten : function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = 'http://kcy.me/api/';
    var params = {
      url: longUrl,
      u: login,
      key: apiKey
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'text',
      success: function(data, status) {
        var errorCode = -1;
        if(data.match(/^http/i)) {
          errorCode = 0;
        }
        callback(errorCode, data);
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

YourlsShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var params = {
      signature: apiKey,
      action:  'shorturl',
      format: 'json',
      url: longUrl
    };

    $.ajax({
      type: 'GET',
      url: serviceUrl,
      data: params,
      dataType: 'json',
      success: function(data, status) {
        if(data && data.status && data.shorturl) {
          callback(0, data.shorturl);
        } else {
          callback(-1, data.message);
        }
      },
      error: function (request, status, error) {
        callback(-1,'AJAX request failed (bad connection?)');
      }
    });
  }
};

McafeeShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://mcaf.ee/api/shorten";
    var params = {
      input_url: longUrl,
      format: 'json'
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'json',
      success: function(data, status) {
        if(!data) {
          callback(-1, chrome.i18n.getMessage("ajaxFailed"));
        }
        if(data.status_code == 200 && data.data) {
          callback(0, data.data.url);
        } else {
          callback(data.status_code, data.status_txt);
        }
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

RodGsShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://rod.gs/";
    var params = {
      longurl: longUrl
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'text',
      success: function(data, status) {
        if(data.match(/^ERROR/i)) {
          callback(-1, data);
          return;
        }
        callback(0, data);
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

MinifyShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://minify.us/api.php";
    var params = {
      u: longUrl
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'text',
      success: function(data, status) {
        if(data.match(/^ERROR/i)) {
          callback(-1, data);
          return;
        }
        callback(0, data);
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

VaMuShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://va.mu/api/create/";
    var params = {
      url: longUrl
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'text',
      success: function(data, status) {
        callback(0, data);
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

HurlimShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://hurl.im/api.php";
    var params = {
      signature: apiKey,
      action:  'shorturl',
      format: 'json',
      url: longUrl
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'json',
      success: function(data, status) {
        if(data && data.status && data.shorturl) {
          callback(0, data.shorturl);
        } else {
          callback(-1, data.message);
        }
      },
      error: function (request, status, error) {
        callback(-1,'AJAX request failed (bad connection?)');
      }
    });
  }
};

MaecrShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://mae.cr/shorten";
    var params = {
      url: longUrl
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      success: function(data, status) {
        if(data) {
          callback(0, data);
        } else {
          callback(-1, "Ooops");
        }
      },
      error: function (request, status, error) {
        callback(-1,'AJAX request failed (bad connection?)');
      }
    });
  }
};

SHORTENERS_BACKEND = {
  bitly: {
    desc: 'bit.ly',
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
  },
  isgd: {
    desc: 'is.gd',
    backend: IsGdShortener
  },
  migreme: {
    desc: 'migre.me',
    baseUrl: 'http://migre.me/',
    backend: MigremeShortener
  },
  miudin: {
    desc: 'miud.in',
    backend: MiudinShortener
  },
  udanax: {
    desc: 'udanax.org',
    baseUrl: 'http://udanax.org/',
    backend: UdanaxShortener
  },
  urlinl: {
    desc: 'URLi.nl',
    baseUrl: 'http://urli.nl/',
    backend: URLinlShortener
  },
  urlcorta: {
    desc: 'URLcorta.es',
    backend: URLcortaShortener
  },
  googl: {
    desc: 'goo.gl',
    backend: GooglShortener
  },
  karmacracy: {
    desc: 'karmacracy.com',
    backend: KCYShortener
  },
  yourls: {
    desc: 'yourls',
    backend: YourlsShortener
  },
  mcafee: {
    desc: 'mcaf.ee',
    backend: McafeeShortener
  },
  rodgs: {
    desc: 'rod.gs',
    backend: RodGsShortener
  },
  minify: {
    desc: 'minify',
    backend: MinifyShortener
  },
  vamu: {
    desc: 'va.mu',
    backend: VaMuShortener
  },
  hurlim: {
    desc: 'hurl.im',
    backend: HurlimShortener
  },
  maecr: {
    desc: 'mae.cr',
    backend: MaecrShortener
  }
};
