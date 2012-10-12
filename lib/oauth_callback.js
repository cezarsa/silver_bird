var OptionsBackend = chrome.extension.getBackgroundPage().OptionsBackend;
var url_shortener = OptionsBackend.get('url_shortener');

if (url_shortener == 'googl' && tweetManager.shortenerAuth.tokenRequested ) {

  if (location.search.search( 'oauth_verifier') != -1 ){
    GooglShortener.getAccessToken( location.search );
  } 
}