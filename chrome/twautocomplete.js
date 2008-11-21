/* Hi! And, thanks for checking out my code. What do you think?
   Drop me a line: tim@timrosenblatt.com
*/

/* 

may have to start passing the doc events around again

*/

var Twautocomplete = {

  // If the performance gets slow, both arrays of users
  // could be stored as some kind of tree structure.
  // For simplicity, it could be indexed on the first
  // or the first and second characters of the name
  
  // Hopefully Scoble doesn't start using this on his
  // 25k followers :D
  //self: this, // http://mikewest.org/archive/component-encapsulation-using-object-oriented-javascript
  friends: [], 
  
  init: function () {
    
  },
  
  onPageLoad: function (event) {
    var doc = event.originalTarget;
    
    // http://developer.mozilla.org/En/Code_snippets/Tabbed_browser
    if (doc instanceof HTMLDocument) {
      if (doc.defaultView.frameElement) {
        return;
      }
      
      if(Twautocomplete.isTwitterURL(doc.location.toString()) && !Twautocomplete.areUserFriendsLoaded()) {
        Twautocomplete.addCSSToPage(doc);
        Twautocomplete.getUserFriends(1);
      }
      else if(Twautocomplete.isTwitterURL(doc.location.toString())) {
        Twautocomplete.addCSSToPage(doc);
        Twautocomplete.setListenersOnTextarea();
        Twautocomplete.setListenersForMouse();
      }
    }
  },
  
  /* 
   * addCSSToPage needs to get called once per page load
   */
  addCSSToPage: function(doc) {
    var link = doc.createElement('link');
    link.setAttribute('type', 'text/css');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('href', 'chrome://twautocomplete-public/content/styles/twautocomplete.css')
    
    doc.getElementsByTagName('head')[0].appendChild(link);
  },

  /*
   * setListenersForFollows monitors clicks to see if the user is
   * clicking a "follow" button, in which case, we will have to
   * update their list
   */
  setListenersForMouse: function () {
    Twautocomplete.debug("OK, About to attach follow event listener");
    
    try {
      var doc = gBrowser.selectedBrowser.contentDocument;
      doc.addEventListener("mouseup", Twautocomplete.wasMouseup, false); 
    }
    catch(e) {
      return false;
    }
    
    Twautocomplete.debug("OK, follow event listeners attached");
  },
  
  wasMouseup: function(e) {
    Twautocomplete.debug("mouseup detected -- was it a follow?");
    var target = e.originalTarget;
    Twautocomplete.debug(target);
    if((target.innerHTML && target.innerHTML == "follow") || (target.value && target.value == "Follow")) {
     Twautocomplete.debug("Someone new is being followed. Stalker!"); setTimeout("Twautocomplete.flushUserFriendCache();Twautocomplete.getUserFriends(1);",2000);
    }
    else {
      // if the popup was active and someone clicks outside of it,
      // we should remove the menu
      Twautocomplete.showMatches([], '');
    }
  },
  
  setListenersOnTextarea: function () {
    Twautocomplete.debug("OK, About to attach event listener");
    
    try {
      var doc = gBrowser.selectedBrowser.contentDocument;
      doc.getElementById('status').addEventListener("keyup", Twautocomplete.monitorWindow, false); 
      doc.getElementById('status').addEventListener("click", Twautocomplete.monitorWindow, false); 
      doc.getElementById('status').addEventListener("keypress", Twautocomplete.onKeyDown, false); 
    
      gBrowser.removeEventListener("focus", Twautocomplete.onPageLoad, true);
    }
    catch(e) {
      //alert(e.message);
      // About the only thing that can go wrong in here is $('status') not being
      // available. If it doesn't, we can just return false. Basically, we were
      // on a Twitter page that wasn't the message page, or Twitter has changed
      // their layout drastically. Either way, it will be the same as if this
      // extension didn't exist.
      return false;
    }
    
    Twautocomplete.debug("OK, event listeners attached");
  },
  
  getSelectedIndex: function () {
    try {
      var doc = gBrowser.selectedBrowser.contentDocument;
      var items = doc.getElementById('twautocomplete_possibilities').childNodes;
    }
    catch (e) {
      Twautocomplete.debug("getSelectedIndex died");
      return false;
    }
    
    for(var i=0; i < items.length; i++) {
      if(items[i].getAttribute('class').indexOf('twautocomplete_selected') != -1) {
        Twautocomplete.debug("getSelectedIndex found index "+i);
        return i;
      }
    }
    
    Twautocomplete.debug("getSelectedIndex fallthrough fail");
    return false;
  },
  
  setSelectedIndex: function (index) {
    Twautocomplete.debug("setSelectedIndex "+index);
    
    var doc = gBrowser.selectedBrowser.contentDocument;
    var items = doc.getElementById('twautocomplete_possibilities').childNodes;
    
    for(var i=0; i < items.length; i++) {
      items[i].setAttribute('class', Twautocomplete.getZebraClassByIndex(i));
    }
    
    items[index].setAttribute('class', Twautocomplete.getZebraClassByIndex(index) + ' twautocomplete_selected');
    Twautocomplete.debug("setSelectedIndex finished");
  },
  
  /*
   * This returns the base class for the zebra stripes
   */
  getZebraClassByIndex: function (index) {
    return index % 2 == 0 ? 'twautocomplete_zebra_light' : 'twautocomplete_zebra_dark';
  },
  
  fillFromIndex: function(index) {
    var doc = gBrowser.selectedBrowser.contentDocument;
    var items = doc.getElementById('twautocomplete_possibilities').childNodes;
    
    for(var i=0; i < items.length; i++) {
      if(items[i].getAttribute('class').indexOf('twautocomplete_selected') != -1) {
        var e = doc.createEvent('MouseEvents');
        e.initEvent('click', true, true)
        items[i].dispatchEvent(e);

        return true;
      }
    }
  },
  
  onKeyDown: function(event) {
    Twautocomplete.debug("-- onKeyDown --");
    // Add ESC keycode
    var TAB = 9;
    var ENTER = 13;
    var ARROW_UP = 38;
    var ARROW_DOWN = 40;
    
    if(event.keyCode == TAB || event.keyCode == ENTER) {
      Twautocomplete.debug("tab or enter");
     
      var selected = Twautocomplete.getSelectedIndex();
      if(typeof(selected)=="boolean" && selected == false) {
        Twautocomplete.debug("abort -- no dropdown present");
        return;
      }
      
      Twautocomplete.fillFromIndex(selected);
      
     
      event.stopPropagation();
      event.preventDefault();
              
      Twautocomplete.debug('eventstop complete');
      return false;
    }
    else if(event.keyCode == ARROW_UP) {
      var selected = Twautocomplete.getSelectedIndex();
      Twautocomplete.debug("up -- selected is "+selected);
      
      if(typeof(selected)=="boolean" && selected == false) {
        Twautocomplete.debug("abort -- no dropdown present");
        return;
      }
      
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
      var selected = Twautocomplete.getSelectedIndex();
      Twautocomplete.debug("down selected is "+selected);
      
      if(typeof(selected)=="boolean" && selected == false) {
        Twautocomplete.debug("abort -- no dropdown present");
        return;
      }
      Twautocomplete.debug("continuing");
      
      var items = gBrowser.selectedBrowser.contentDocument.getElementById('twautocomplete_possibilities').childNodes;
      
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
    
    var input = gBrowser.selectedBrowser.contentDocument.getElementById('status');
    
    if(typeof input == "undefined") {
      Twautocomplete.debug("input was undefined");
      return;
    }
    
    Twautocomplete.debug('Monitoring.. input.value is "'+input.value+'"');
    
    Twautocomplete.debug("At selectionStart "+input.selectionStart);
    
    // Do a quick return here, rather than wrap it
    // the whole thing in the if(condition) and force indents
    if(!input.selectionStart || input.selectionStart == 0 ||  input.value == '' || input.value[input.selectionStart-1] == ' ') { 
      Twautocomplete.showMatches([], ''); // Show no matches
      return;                                         
    }
    
    var message = input.value;
    var name_token = '';
    
    for(var position = input.selectionStart-1; position >= 0; position--) {
      Twautocomplete.debug('loop at position '+position +' and message[position] is "'+message[position]+'"');
      if(message[position] == ' ') {
        if(message[position-1] && message[position-1] == 'd') {
          if(position > 2 && message[position-2] != ' ') {
          }
          else {
            Twautocomplete.completeStartingWith(name_token);
            break;
          }
        }
        else {
          Twautocomplete.showMatches([], ''); // Show no matches
          return; // We hit an empty space, this current token has no chance of being a name
        }
      }
      else if(message[position] == '@' && (position < 3 || message[position-1] == ' ')) {
        Twautocomplete.completeStartingWith(name_token); 
        break;
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
    return;
    
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
            
            Twautocomplete.setListenersOnTextarea();

            return; // This covers when there are none
          }

          var name, screen_name, profile_image_url;

          for(var i=0; i < response.length; i++) {
            name                   = response[i].name || '';
            name_normalized        = name.toLowerCase();
            screen_name            = response[i].screen_name || '';
            screen_name_normalized = screen_name.toLowerCase();
            profile_image_url      = response[i].profile_image_url || '';

            Twautocomplete.friends.push({"name": name, "name_normalized": name_normalized, "screen_name": screen_name, "screen_name_normalized": screen_name_normalized, "profile_image_url": profile_image_url});
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
  
  completeStartingWith: function(partial_name) {
    partial_name = partial_name.toLowerCase();
    
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
      
      
      if(partial_name == screen_name.substr(0, partial_name.length)) {
        // This puts names first, since names are more identifiable
        Twautocomplete.debug('got a match with name '+name+', screen_name '+screen_name);
        tmp_idx = possibilities.push(Twautocomplete.friends[idx]);
        possibilities[tmp_idx-1].match_type = "screen_name";
      }
      else if(partial_name == name.substr(0, partial_name.length)) {
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
      }
    }
    if(possibilities.length == 0) {
      return false;
    }
//    Twautocomplete.debug(possibilities.length);
    Twautocomplete.debug("creating the ul");
    
    var li, ul = doc.createElement('ul');
    
    for(var i = 0; i < possibilities.length; i++) {
      li = doc.createElement('li');
      
      if(i==0) {
        li.setAttribute('class', Twautocomplete.getZebraClassByIndex(i) + ' twautocomplete_selected');
      }
      else {
        li.setAttribute('class', Twautocomplete.getZebraClassByIndex(i));
      }
      
      if(possibilities[i].screen_name_normalized.substr(0,partial_name.length) == partial_name) {
        // If it's the screen name that matches
        li.innerHTML = "<strong>" + possibilities[i].screen_name.substr(0,partial_name.length) + "</strong>" + possibilities[i].screen_name.substr(partial_name.length);
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
      }
      
      li.innerHTML = "<img style='height:24px;width:24px;margin-top:3px;margin-left:6px;float:left;' src='"+possibilities[i].profile_image_url+"' /><span style=''>" + li.innerHTML + "</span>";
      
      li.setAttribute('screen_name', possibilities[i].screen_name);
      
      li.setAttribute('onclick', 'document.getElementById("status").value  = document.getElementById("status").value.substr(0, document.getElementById("status").selectionStart - '+partial_name.length+') + "'+possibilities[i].screen_name+' " + document.getElementById("status").value.substr(document.getElementById("status").selectionStart); var e = document.createEvent("KeyboardEvent"); e.initKeyEvent("keyup", true, true, null, false, false, false, false, 32, 0);document.getElementById("status").dispatchEvent(e);document.getElementById("status").focus();');
      
      
      ul.appendChild(li);
    }
    
    ul.setAttribute('partial_name', partial_name);
    ul.setAttribute('id', 'twautocomplete_possibilities');
    ul.setAttribute('style', 'text-align:left;position:absolute;background-color:#fff;left:20px;border:1px solid #000;');
    
    try {
      doc.getElementById('status').parentNode.insertBefore(ul, doc.getElementById('status').nextSibling);
    }
    catch(e) {}
  },
  
}




function Twautocomplete_page_watcher() { 
  // If people are cookied in, load their friends on browser load
  // otherwise monitor for a twitter url
  Twautocomplete.getUserFriends(1);
  
  gBrowser.addEventListener("DOMContentLoaded", Twautocomplete.onPageLoad, true); 
}

// Trying to not use an object's method as the callback,
// but the developer info has conflicting information under
// the "Memory issues" section at bottom. What's better
// lambdas or object methods?
// http://developer.mozilla.org/En/DOM/Element.addEventListener
window.addEventListener("load", Twautocomplete_page_watcher, false);

