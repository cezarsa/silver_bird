ImageServices = {
  addService: function(domain, thumbUrl) {
    this.services = this.services || [];
    this.services.push(new ImageService(domain, thumbUrl));
  },

  getThumb: function(url) {
    for(var i = 0, len = this.services.length; i < len; ++i) {
      var service = this.services[i];
      var thumbUrl = service.getThumb(url);
      if(thumbUrl) {
        return thumbUrl;
      }
    }
    return null;
  }
};

function ImageService(domain, thumbUrl) {
  this.domain = domain;
  this.thumbUrl = thumbUrl;
  if(typeof this.thumbUrl == 'function') {
    this.thumbFunc = this.thumbUrl;
  }

  this.getThumb = function(url) {
    var urlMatch = url.match(/(https?:\/\/|www\.)(.*?)\/(.*)$/i);
    var domain = urlMatch[2];
    var path = urlMatch[3];
    if(this.domain == domain) {
      if(this.thumbFunc) {
        return this.thumbFunc(path, url);
      }
      return this.thumbUrl.replace('$1', path).replace('$2', url);
    }
    return null;
  };
}

// $1 is the remaining url after the server and domain name, $2 is the full original url
ImageServices.addService('twitpic.com',     'http://twitpic.com/show/thumb/$1');
ImageServices.addService('twitgoo.com',     'http://twitgoo.com/show/thumb/$1');
ImageServices.addService('yfrog.com',       'http://yfrog.com/$1.th.jpg');
ImageServices.addService('movapic.com',     function(path) { return 'http://image.movapic.com/pic/t_' + path.split('/')[1] + '.jpeg'; });
ImageServices.addService('tweetphoto.com',  'http://TweetPhotoAPI.com/api/TPAPI.svc/imagefromurl?url=$2');
ImageServices.addService('pict.mobi',       'http://pict.mobi/show/thumb/$1');