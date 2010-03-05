function authorize() {
  var requestToken = $('p').text().match("token (.*) has")[1];
  chrome.extension.sendRequest({identica_request_token: requestToken}, function(response) {

  });
}
authorize();
