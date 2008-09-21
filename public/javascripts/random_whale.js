function create_event(event_name, values, callback) {
  if(!('createEvent' in document)) {
    return false;
  }

  var bottle = document.createElement('random-whale-' + event_name); 
    
  if(values!=null) {
    for(var key in values) {
      bottle.setAttribute(key, values[key]);
    }
  }
    
  document.getElementsByTagName('body')[0].appendChild(bottle);
  var e = document.createEvent('Events');
  e.initEvent('random-whale-' + event_name, true, false);
  bottle.dispatchEvent(e);
    
  if(callback!= null) { // Should this callback be asynchronous?
    callback();
  }
  
  return true;
}