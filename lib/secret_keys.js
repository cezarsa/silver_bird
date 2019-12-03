/*
  You should fill this file with your API keys
*/
var SecretKeys = {
  twitter: {
    consumerSecret: 'gxryIStLZGTtLfuGr37JSXhw4R4di9sS7gLUS8LrIAzcni7Alk',
    consumerKey: 'mjDI3c8D4XGUIn9lkPK1f86Y9'
  },
  identica: {
    consumerSecret: '5160eba9484e97fa164acd7fd5aa9b83',
    consumerKey: '4f7780c1329c67a3d69c84c11a4edf9d'
  },
  yfrog: {
    key: '08BDELNP1e0440348de79a30aa12b98e06aa8be2'
  },
  twitpic: {
    key: '304318d9f93d61f0403593d98731ca80'
  },

  hasValidKeys: function() {
    return (this.twitter.consumerSecret != '' && this.twitter.consumerKey != '') ||
            (this.identica.consumerSecret != '' && this.identica.consumerKey != '');
  }
};
