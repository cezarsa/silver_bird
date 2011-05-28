/* 
  You should fill this file with your API keys
*/
var SecretKeys = {
  twitter: {
    consumerSecret: '',
    consumerKey: ''
  },
  identica: {
    consumerSecret: '',
    consumerKey: ''
  },
  yfrog: {
    key: ''
  },
  twitpic: {
    key: ''
  },

  hasValidKeys: function() {
    return (this.twitter.consumerSecret != '' && this.twitter.consumerKey != '') ||
            (this.identica.consumerSecret != '' && this.identica.consumerKey != '');
  }
};