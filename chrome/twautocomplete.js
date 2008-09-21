/* Hi! And, thanks for checking out my code. What do you think?
   Drop me a line: tim@timrosenblatt.com
*/

/* 

possibly show the icon associated with the user
stop capitalization
-- this will require double data. a lot of systems
end up being easier to design by storing displayed data separately
from the data that is being analyzed, even though they are essentially
the same data -- having quick access to normalized data is incredibly
useful to a project


once this is more solidified, sign up for a new twitter account
and add tons and tons of people to benchmark it a bit more. post
a few messages from the account to say that peoplep shouldn't follow
me back, i just need to add lots of contacts so i can benchmark
my autocomplete plugin for twitter

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
        doc.getElementById('status').addEventListener("keyup", Twautocomplete.monitorWindow, false); 
        doc.getElementById('status').addEventListener("keypress", Twautocomplete.onKeyDown, false); 
        
        Twautocomplete.debug("OK, event listeners attached");
      }
    }
  },
  
  getSelectedIndex: function () {
    var doc = gBrowser.selectedBrowser.contentDocument;
    var items = doc.getElementById('twautocomplete_possibilities').childNodes;
    
    for(var i=0; i < items.length; i++) {
      if(items[i].getAttribute('style') != '') {
        return i;
      }
    }
  },
  
  setSelectedIndex: function (index) {
    Twautocomplete.debug("setSelectedIndex "+index);
    
    var doc = gBrowser.selectedBrowser.contentDocument;
    var items = doc.getElementById('twautocomplete_possibilities').childNodes;
    
    for(var i=0; i < items.length; i++) {
      items[i].setAttribute('style', '');
      Twautocomplete.debug(items[i].getAttribute('style'));
    }
    
    items[index].setAttribute('style','background-color:#ddd;');
    Twautocomplete.debug("setSelectedIndex finished");
  },
  
  fillFromIndex: function(index) {
    var doc = gBrowser.selectedBrowser.contentDocument;
    var items = doc.getElementById('twautocomplete_possibilities').childNodes;
    
    for(var i=0; i < items.length; i++) {
      if(items[i].getAttribute('style') != '') {
        var e = doc.createEvent('MouseEvents');
        e.initEvent('click', true, true)
        items[i].dispatchEvent(e);
        
        
//        doc.getElementById('status').value += items[i].getAttribute('screen_name') + ' '
        return true;
      }
    }
  },
  
  onKeyDown: function(event) {
    Twautocomplete.debug("-- onKeyDown --");
    var TAB = 9;
    var ENTER = 13;
    var ARROW_UP = 38;
    var ARROW_DOWN = 40;
    
    // the tab wasn't working
    // seems like it might have to be on
    // keydown, and not keyup?
    if(event.keyCode == TAB || event.keyCode == ENTER) {
      Twautocomplete.debug("tab or enter");
     
      var selected = Twautocomplete.getSelectedIndex();
      Twautocomplete.fillFromIndex(selected);
      
     
      event.stopPropagation();
      event.preventDefault();
              
      Twautocomplete.debug('eventstop complete');
      return false;
    }
    else if(event.keyCode == ARROW_UP) {
      var selected = Twautocomplete.getSelectedIndex();
      Twautocomplete.debug("up -- selected is "+selected);
      
      if(selected > 0) {
        Twautocomplete.setSelectedIndex(selected-1);
      }

      event.stopPropagation();
      event.preventDefault();
                    
      Twautocomplete.debug('eventstop complete');
      return false;
    }
    else if(event.keyCode == ARROW_DOWN) {
      Twautocomplete.debug("down");
      var items = gBrowser.selectedBrowser.contentDocument.getElementById('twautocomplete_possibilities').childNodes;
      var selected = Twautocomplete.getSelectedIndex();
      Twautocomplete.debug("down selected is "+selected + " and items.length is "+items.length);
      
      if(selected < items.length-1) {
        Twautocomplete.debug('about to set index');
        Twautocomplete.setSelectedIndex(selected+1);
      }

      event.stopPropagation();
      event.preventDefault();
                   
      Twautocomplete.debug('eventstop complete');
      return false;
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
          }
          else {
            Twautocomplete.completeStartingWith(name_token, doc);
          }
        }
        else {
          Twautocomplete.showMatches([], ''); // Show no matches
          return; // We hit an empty space, this current token has no chance of being a name
        }
      }
      // really this needs to just use an XOR() http://www.howtocreate.co.uk/xor.html
      else if(message[position] == '@' && (position < 3 || message[position-1] == ' ')) {
        Twautocomplete.completeStartingWith(name_token, doc); 
      }
      else if(message[position] != ' ') {
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
gBrowser.selectedBrowser.contentDocument.getElementById('status').addEventListener("keyup", Twautocomplete.monitorWindow, false); 
gBrowser.selectedBrowser.contentDocument.getElementById('status').addEventListener("keypress", Twautocomplete.onKeyDown, false); 
Twautocomplete.debug("OK, event listener attached");

            return; // This covers when there are none
          }

          var name, screen_name;

          for(var i=0; i < response.length; i++) {
            name                   = response[i].name || '';
            name_normalized        = name.toLowerCase();
            screen_name            = response[i].screen_name || '';
            screen_name_normalized = screen_name.toLowerCase();

            Twautocomplete.friends.push({"name": name, "name_normalized": name_normalized, "screen_name": screen_name, "screen_name_normalized": screen_name_normalized});
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
    partial_name = partial_name.toLowerCase();
    Twautocomplete.debug(partial_name);
    
    if(partial_name.length==0) {
      Twautocomplete.debug("partial_name length 0");
      Twautocomplete.showMatches([], partial_name); // Show no matches
      return;
    }
    
    var name, screen_name, possibilities = [], tmp_idx;
    
    for(idx in Twautocomplete.friends) {
      if(isNaN(idx)) {
        continue;
      }
      
      name        = Twautocomplete.friends[idx].name_normalized;
      screen_name = Twautocomplete.friends[idx].screen_name_normalized;
      
      
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
      
      if(i==0) {
        li.setAttribute('style', 'background-color:#ddd;');
      }
      else {
        li.setAttribute('style', '');
      }
      
      if(possibilities[i].screen_name_normalized.substr(0,partial_name.length) == partial_name) {
        // If it's the screen name that matches
        li.innerHTML = "<strong>"+possibilities[i].screen_name.substr(0,partial_name.length)+"</strong>" + possibilities[i].screen_name.substr(partial_name.length);
      }
      else {
        // Just pass it through untouched
        li.innerHTML = possibilities[i].screen_name;
      }
    
      if(possibilities[i].screen_name != possibilities[i].name) {
        
        if(possibilities[i].name_normalized.substr(0,partial_name.length) == partial_name) {
          li.innerHTML += " (<strong>"+possibilities[i].name.substr(0,partial_name.length)+"</strong>" + possibilities[i].name.substr(partial_name.length) + ")";
        }
        else {
          li.innerHTML += " (" + possibilities[i].name +")";
        }
        
        
        //li.innerHTML += " (" + "<strong>"+possibilities[i].name.substr(0, partial_name.length)+"</strong>" + possibilities[i].name.substr(partial_name.length) + ")";
      }
      
      li.setAttribute('screen_name', possibilities[i].screen_name);
      
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

