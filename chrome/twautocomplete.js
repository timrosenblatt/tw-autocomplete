/* Hi! And, thanks for checking out my code. What do you think?
   Drop me a line: tim@timrosenblatt.com
*/

/* 

TEXT = $('status').value

if the last character of TEXT is an "@" or the last two are "d ",
add a "dropdown" or search div thing to the page, right around
the text box.

maybe just do unbroken characters after the @hfif or the 'd xxx' that way even if they
start typing it will catch up

possibly show the icon associated with the user

whenever a page loads at twitter.com, (and the contact list hasn't yet loaded)
 attempt to load the default
url for the people the user is following. if error is detected,
just silently fail

let people type the person's name, and also the person's twittername


if a success is detected, store the contact list (to prevent future loads)


http://twitter.com/statuses/friends.json?lite=true
http://twitter.com/statuses/friends.json?lite=true&page=2
http://twitter.com/statuses/friends.json?lite=true&page=3
works when logged in
basically, keep loading until the response is an empty
array, that means all the users have been loaded
*/
var Twautocomplete = {

  // If the performance gets slow, both arrays of users
  // could be stored as some kind of tree structure.
  // For simplicity, it could be indexed on the first
  // or the first and second characters of the name
  
  // Hopefully Scoble doesn't start using this on his
  // 25k followers :D
  friends: [], 
  
  init: function () {
    
  },
  
  onPageLoad: function (event) {
    var doc = event.originalTarget;
    
    // http://developer.mozilla.org/En/Code_snippets/Tabbed_browser
    if (doc instanceof HTMLDocument) {
      //var doc = event.originalTarget;
      if (doc.defaultView.frameElement) {
        // Frame within a tab was loaded. doc should be the root document of
        // the frameset. If you don't want do anything when frames/iframes
        // are loaded in this web page, uncomment the following line:
        return;
        // Find the root document:
        //while (doc.defaultView.frameElement) {
        //  doc=doc.defaultView.frameElement.ownerDocument;
        //}
      }
      
      if(Twautocomplete.isTwitterURL(doc.location.toString()) && !Twautocomplete.areUserFriendsLoaded()) {
        Twautocomplete.getUserFriends(1);
      }
      else if(Twautocomplete.isTwitterURL(doc.location.toString())) {
        Twautocomplete.debug("OK, About to attach event listener");
        doc.getElementById('status').addEventListener("keypress", Twautocomplete.monitorWindow, true); 
        Twautocomplete.debug("OK, event listener attached");
        //doc.twitter_monitor = setTimeout(function() { Twautocomplete.monitorWindow(doc); }, 1000);
      }
    }
  },
  
  monitorWindow: function(doc) {
    Twautocomplete.debug("monitorWindow!");
    var input = doc.originalTarget;
    
    // doc = doc || gBrowser.selectedBrowser.contentDocument; 
    // 
    input = gBrowser.selectedBrowser.contentDocument.getElementById('status');
    
    if(typeof input == "undefined") {
      Twautocomplete.debug("input was undefined");
      return;
    }

//    doc.twitter_monitor = setTimeout(function() { Twautocomplete.monitorWindow(doc); }, 1000);
    
    Twautocomplete.debug('Monitoring.. input.value is "'+input.value+'"');
    
    Twautocomplete.debug("At selectionStart "+input.selectionStart);
    
    // Do a quick return here, rather than wrap it
    // the whole thing in the if(condition) and force indents
    if(!input.selectionStart || input.selectionStart == 0 ||  input.value == '') { 
      Twautocomplete.showMatches([], ''); // Show no matches
      return;                                         
    }
    
    var message = input.value;
    var name_token = '';
    
    for(var position = input.selectionStart-1; position >= 0; position--) {
      Twautocomplete.debug('loop at position '+position +' and message[position] is "'+message[position]+'"');
      if(message[position] == ' ') {
        Twautocomplete.debug('a');
        if(message[position-1] && message[position-1] == 'd') {
          Twautocomplete.debug('we got a d');
          if(position > 2 && message[position-2] != ' ') {
            Twautocomplete.debug('b');
          }
          else {
            Twautocomplete.debug('c');
            Twautocomplete.completeStartingWith(name_token, doc);
          }
        }
        else {
          Twautocomplete.debug('d');
          Twautocomplete.showMatches([], ''); // Show no matches
          Twautocomplete.debug('d2');
          return; // We hit an empty space, this current token has no chance of being a name
        }
      }
      // really this needs to just use an XOR() http://www.howtocreate.co.uk/xor.html
      else if(message[position] == '@' && (position < 3 || message[position-1] == ' ')) {
        Twautocomplete.debug('f');
        Twautocomplete.completeStartingWith(name_token, doc); 
      }
      else if(message[position] != ' ') {
        Twautocomplete.debug('e');
        name_token = message[position] + name_token;
      }
      else {
        Twautocomplete.showMatches([], ''); // Show no matches
      }
    }
    

  },

  isTwitterURL: function(url) {
    return !!url.match(/twitter.com/);
  },
  
  debug: function(message) {
    var now = new Date(); // .format relies on the date_format.js; not part of ECMAScript
    Firebug.Console.log(now.format('h:MM:ss TT') + ' ' + message);
  },
  
  areUserFriendsLoaded: function () {
    return Twautocomplete.friends.length > 0;
  },
  
  flushUserFriendCache: function() {
    Twautocomplete.friends = [];
  },
  
  getUserFriends: function (page) {
    Twautocomplete.debug("getUserFriends("+page+")");
    page = page ? page : 1;
    
    // http://twitter.com/statuses/friends.json?lite=true
    // http://twitter.com/statuses/friends.json?lite=true&page=2
    // http://twitter.com/statuses/friends.json?lite=true&page=3
    // Gotta keep loading them until empty arrays are returned
    var fullURL = "http://twitter.com/statuses/friends.json?lite=true&page=" + page;
    var httpRequest = new XMLHttpRequest();

    httpRequest.open("GET", fullURL, true);
    httpRequest.onload = function () { Twautocomplete.callback_getUserFriends(httpRequest, page); };
    httpRequest.send(null);
  },
  
  /* One option might be to loop through all open tabs to find those
  with Twitter URLs, and then attach the watcher to all of them. */
  callback_getUserFriends: function (httpRequest, page) {
    Twautocomplete.debug("callback_getUserFriends loaded for page " + page);
    
    if(httpRequest.readyState == 4) {
			switch(httpRequest.status) {
			  /* Twitter status codes
			     http://apiwiki.twitter.com/REST+API+Documentation#HTTPStatusCodes
			     * 200 OK: everything went awesome.
           * 304 Not Modified: there was no new data to return.
           * 400 Bad Request: your request is invalid, and we'll return an error message that tells you why. This is the status code returned if you've exceeded the rate limit (see below). 
           * 401 Not Authorized: either you need to provide authentication credentials, or the credentials provided aren't valid.
           * 403 Forbidden: we understand your request, but are refusing to fulfill it.  An accompanying error message should explain why.
           * 404 Not Found: either you're requesting an invalid URI or the resource in question doesn't exist (ex: no such user). 
           * 500 Internal Server Error: we did something wrong.  Please post to the group about it and the Twitter team will investigate.
           * 502 Bad Gateway: returned if Twitter is down or being upgraded.
           * 503 Service Unavailable: the Twitter servers are up, but are overloaded with requests.  Try again later.
           
			  */    
				case 200:
				  Twautocomplete.debug("callback_getUserFriends case 200");
  				var response = JSON.parse(httpRequest.responseText);

          if(response.length == 0) {
            Twautocomplete.debug("No more friends, stopped at page " + page);
            if (page > 20) { Twautocomplete.debug("Baaa. This person is a sheep, they do nothing but follow. :D"); }
            else if (page > 9) { Twautocomplete.debug("No more friends, stopped at page "); }
            else if (page > 4) { Twautocomplete.debug("This person is a mild Twitter addict"); }
            else if (page > 1) { Twautocomplete.debug("This person is a low-level user"); }
            
//            setTimeout(function() { Twautocomplete.monitorWindow(); }, 1000);
Twautocomplete.debug("OK, About to attach event listener");
gBrowser.selectedBrowser.contentDocument.getElementById('status').addEventListener("keypress", Twautocomplete.monitorWindow, true); 
Twautocomplete.debug("OK, event listener attached");

            return; // This covers when there are none
          }

          var name, screen_name;

          for(var i=0; i < response.length; i++) {
            name        = response[i].name || '';
            screen_name = response[i].screen_name || '';

            Twautocomplete.friends.push({"name": name, "screen_name": screen_name});
          }

          // Sort of tail-recursive. I wonder what would happen with
          // lots of pages of friends.
          response = ''; // Possibly help with the mem usage. Big strings are big.
          Twautocomplete.getUserFriends(page+1);        
					break;
				default:
				  // Might be a good idea to put an alert at top of window that twitter was
				  // not reachable for an update, autocomplete is off
				  Twautocomplete.flushUserFriendCache();
					Twautocomplete.debug("callback_getUserFriends got status " + httpRequest.status + " and responseText " + httpRequest.responseText);
			}
    }    
  },
  
  completeStartingWith: function(partial_name, doc) {
    Twautocomplete.debug(partial_name);
    
    if(partial_name.length==0) {
      Twautocomplete.debug("partial_name length 0");
      Twautocomplete.showMatches([], partial_name); // Show no matches
      return;
    }
    
    /* These two arrays could be stored as a single array 
    or maybe store the screen names indexed by real name,
    etc...the way the data has to be read/written from kind of dictates
    the structure that it's stored in. Also, I want an easy
    way of preventing duplicate items from appearing in the autocomplete
    
    Structures basically come down
    to "am i more often reading or writing to this structure?"*/
    //[ {"name": "Tim Rosenblatt", "screen_name": "timrosenblatt"}, {"name": "Guido van Rossum", "screen_name": "gvanrossum"}, 
    //friend_real_names: [], 
    var name, screen_name, possibilities = [], tmp_idx;
    
    for(idx in Twautocomplete.friends) {
      if(isNaN(idx)) {
        continue;
      }
      
      name = Twautocomplete.friends[idx].name;
      screen_name = Twautocomplete.friends[idx].screen_name;
      
      
      if(partial_name == screen_name.substr(0,partial_name.length)) {
        // This puts names first, since names are more identifiabl
        Twautocomplete.debug('got a match with name '+name+', screen_name '+screen_name);
        tmp_idx = possibilities.push(Twautocomplete.friends[idx]);
        possibilities[tmp_idx-1].match_type = "screen_name";
      }
      else if(partial_name == name.substr(0,partial_name.length)) {
        Twautocomplete.debug('got a match with name '+name+', screen_name '+screen_name);
        tmp_idx = possibilities.push(Twautocomplete.friends[idx]);
        possibilities[tmp_idx-1].match_type = "name";
      }
    }
    
    Twautocomplete.showMatches(possibilities, partial_name);
  },
  
  showMatches: function(possibilities, partial_name) {
    Twautocomplete.debug('showMatches possibilities='+possibilities+' partial_name='+partial_name);
    doc = gBrowser.selectedBrowser.contentDocument;
    // find out if there is a match list being displayed already
    // and if it needs updating
    var previous_ul = doc.getElementById('twautocomplete_possibilities');

    if(previous_ul) {
      if(previous_ul.getAttribute('partial_name') == partial_name) {
        Twautocomplete.debug("No need to change a thing");
        return;
      }
      else {
        Twautocomplete.debug("removing old twautocomplete_possibilities");
        doc.getElementById('twautocomplete_possibilities').parentNode.
                  removeChild(doc.getElementById('twautocomplete_possibilities'));
        if(possibilities.length == 0) {
          return;
        }
      }
    }
    
    Twautocomplete.debug("creating the ul");
    
    var li, ul = doc.createElement('ul');
    
    for(var i = 0; i < possibilities.length; i++) {
      li = doc.createElement('li');
      li.innerHTML = "<strong>"+possibilities[i].screen_name.substr(0,partial_name.length)+"</strong>" + possibilities[i].screen_name.substr(partial_name.length);
      if(possibilities[i].screen_name != possibilities[i].name) {
        li.innerHTML += " (" + "<strong>"+possibilities[i].name.substr(0, partial_name.length)+"</strong>" + possibilities[i].name.substr(partial_name.length) + ")";
      }
      
      li.setAttribute('onclick', '$("status").value=$("status").value.substr(0,$("status").value.length-'+partial_name.length+') + "'+possibilities[i].screen_name+' ";');
      ul.appendChild(li);
    }
    
    ul.setAttribute('partial_name', partial_name);
    ul.setAttribute('id', 'twautocomplete_possibilities');
    ul.setAttribute('style', 'text-align:left;position:absolute;background-color:#fff;');
    
    doc.getElementById('status').parentNode.insertBefore(ul, doc.getElementById('status').nextSibling);
  },
  
}




function Twautocomplete_page_watcher() { 
  gBrowser.addEventListener("load", Twautocomplete.onPageLoad, true); 
}

// Trying to not use an object's method as the callback,
// but the developer info has conflicting information under
// the "Memory issues" section at bottom.
// http://developer.mozilla.org/En/DOM/Element.addEventListener
window.addEventListener("load", Twautocomplete_page_watcher, false);

