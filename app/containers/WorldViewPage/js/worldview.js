import cookie from 'react-cookie';

var viewContainer = null;

var user = null;

var props = null;

var map = null;
var searchbar = null;

var mouseDownPoint = null;
var mouseUpPoint = null;

var components = [];

var sceneInfoList = [];

var myStationGeo = null;
var isLocationEnabled = false;

var currentLocation = null;

var isPickMode = false;
var pickedGroup = [];
var userAvatar = null;
var userName = '';

var defaultZoom = 13;

function flyAnimation(position, zoom, maxZoom, complete) {
  if (map == undefined) {
    return;
  }

  currentLocation = {
    latitude: position[0],
    longitude: position[1],
  };

  var flying = 0;

  map.setView(map.getCenter(), maxZoom, {
    animate: true,
    duration: 3000,
  });

  map.on('moveend', function() {
    if (flying == 0) {
      flying = 1;
      map.setView(position, maxZoom);
    } else if (flying == 1) {
      flying = 2;
      map.setView(position, zoom, {
        animate: true,
        duration: 2000,
      });
    } else if (flying == 2) {
      complete();
    }
  });
}

export function removeMap() {
  if (map != undefined) {
    map.remove();
  }
}

export function gotoNewYork() {}

export function gotoBeverlyHill() {
  showFlying(true);
  if (map != undefined) {
    flyAnimation([34.067806, -118.401345], defaultZoom, 3, function() {
      showFlying(false);
    });
  }
}

export function gotoMystation() {
  props.changeRoute('/user/' + userName);
}

export function gotoShop() {
  showFlying(true);
  if (map != undefined) {
    flyAnimation(
      [34.07271005818638, -118.39909435059153],
      defaultZoom,
      3,
      function() {
        showFlying(false);
      }
    );
  }
}

// export function gotoMystation() {
//     if (map != undefined)
//     {
//         if (myStationGeo == null)
//         {
//             return;
//         }

//         showFlying(true);
//         flyAnimation([myStationGeo[1], myStationGeo[0]], 15, 3, function()
//         {
//             showFlying(false);
//         });
//     }
// }

function isHomeLocation(position) {
  if (currentLocation == null) return false;

  var distance = Math.sqrt(
    Math.pow(position.longitude - currentLocation.longitude, 2) +
      Math.pow(position.latitude - currentLocation.latitude, 2)
  );

  if (distance > Math.PI / 360) return false;
}

export function gotoHome() {
  if (isLocationEnabled == false) {
    if (confirm('Please tap here to allow location data.')) {
      isLocationEnabled = true;
      gotoHome();
    }
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function(position) {
      if (map != undefined) {
        currentLocation = {
          latitude: map.getCenter().lat,
          longitude: map.getCenter().lng,
        };

        var isHome = isHomeLocation({
          longitude: position.coords.longitude,
          latitude: position.coords.latitude,
        });
        if (isHome == false) {
          showFlying(true);
          if (map != undefined) {
            setTimeout(function() {
              flyAnimation(
                [position.coords.latitude, position.coords.longitude],
                defaultZoom,
                3,
                function() {
                  showFlying(false);
                }
              );
            }, 1000);
          }
        }
      }
    },
    function() {
      jQuery.getJSON(
        'https://freegeoip.net/json/',
        function(data) {
          //data
          /*
            city, country_code, country_name, ip, latitude, longitude, metro_code
            region_code, region_name, time_zone, zip_code
            */

          if (map != undefined) {
            currentLocation = {
              latitude: map.getCenter().lat,
              longitude: map.getCenter().lng,
            };

            var isHome = isHomeLocation({
              longitude: data.longitude,
              latitude: data.latitude,
            });
            if (isHome == false) {
              showFlying(true);
              if (map != undefined) {
                setTimeout(function() {
                  flyAnimation(
                    [data.latitude, data.longitude],
                    defaultZoom,
                    3,
                    function() {
                      showFlying(false);
                    }
                  );
                }, 1000);
              }
            }
          }
        },
        function() {
          isLocationEnabled = true;
        }
      );
    }
  );
}

function showFlying(enable) {
  if (enable) {
    jQuery('#logo').show(250);
  } else {
    jQuery('#logo').hide(250);
  }
}

function showStationBuilder(sceneId) {
  props.changeRoute('/station/' + sceneId);
}

function showKhanModel() {
  showStationBuilder('287d879c-6162-4717-8fe5-8f8de87ab1b1');
}

var Building = function() {
  var main = this;
  main.position = {
    lat: 0,
    lon: 0,
  };

  main.avatar = null;

  main.ownerId = null;
  main.ownerName = null;

  main.setLatLon = function(lat, lon) {
    main.position.lat = lat;
    main.position.lon = lon;
  };

  main.setOwnerName = function(ownername) {
    main.ownerName = ownername;
  };

  main.setOwnerId = function(ownerId) {
    main.ownerId = ownerId;
  };

  main.load = function() {
    var userCookie = cookie.load('user');
    fetch('/users/info/', {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: 'Basic',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'username=' + main.ownerName,
    }).then(function(response) {
      response.json().then(function(json) {
        var fbID = json['facebookUserId'];

        var name =
          'https://www.gravatar.com/avatar/' + json['gravatarHash'] + '.png';

        var rotation = 75.0;

        if (fbID == null) {
          if (json['gravatarHash'] == null || json['gravatarHash'] == '') {
            name = 'https://clara.io/img/default_avatar.png';
            rotation = 75.0;
          }
        } else {
          name = 'https://graph.facebook.com/' + fbID + '/picture?type=normal';
          rotation = 0;
        }

        main.loadAvatar(
          name,
          [main.position.lat, main.position.lon],
          50,
          50,
          rotation,
          function() {
            if (main.ownerId != undefined) {
              showStationBuilder(main.ownerId);
            } else showStationBuilder('aa1cd0ba-8c73-4484-aa87-19c975b6f72d');
          }
        );
      });
    });
  };

  main.loadAvatar = function(
    url,
    position,
    size,
    elevation,
    rotation,
    clicked
  ) {
    if (map != undefined) {
      var img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = function() {
        var canvas = document.createElement('canvas');
        canvas.width = 60;
        canvas.height = 60;
        var ctx = canvas.getContext('2d');

        ctx.save();
        ctx.beginPath();
        ctx.arc(30, 30, 30, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -30, -30, 60, 60); //img.width, img.height

        ctx.arc(0, 0, 30, 0, Math.PI * 2, true);
        ctx.clip();
        ctx.closePath();
        ctx.restore();

        var dataURL = canvas.toDataURL();

        main.avatar = addPickAvatar(
          dataURL,
          position,
          size,
          elevation,
          clicked
        );
      };

      img.src = url;
    }
  };
};

function showFlying(enable) {
  if (enable) {
    jQuery('#logo').show(250);
  } else {
    jQuery('#logo').hide(250);
  }
}

function loadScene(complete) {
  for (var i = 0; i < sceneInfoList.length; i++) {
    var lon = sceneInfoList[i].geolocation[0];
    var lat = sceneInfoList[i].geolocation[1];

    var building = new Building();
    building.setLatLon(lat, lon);

    building.setOwnerName(sceneInfoList[i].ownername);
    building.setOwnerId(sceneInfoList[i].sceneId);

    building.load();
  }

  //20170703 - remove SkyScrapper
  // addSkyScrapper();
  addTAO();
  addStore();

  if (complete != undefined) {
    complete();
  }
}

function addSkyScrapper() {
  addAvatar(
    '../../images/photo_18.png',
    [40.748426424, -73.9858398],
    50,
    120,
    function() {
      showStationBuilder('287d879c-6162-4717-8fe5-8f8de87ab1b1');
    }
  );
}

function addTAO() {
  if (map != undefined) {
    var myIcon = L.icon({
      iconUrl: '../../images/tao_logo.png',
      iconSize: [150, 50],
    });

    var marker = L.Wrld.marker([36.122678, -115.170072], {
      icon: myIcon,
      elevation: 50,
    }).addTo(map);

    marker.on('click', function() {
      window.location.assign(
        'http://tours.virtualmarketing360.com/index.php?tour=460027'
      );
    });
  }
}

function addStore() {
  if (map != undefined) {
    var myIcon = L.icon({
      iconUrl: '../../images/flightdeck-logo.png',
      iconSize: [200, 50],
    });

    var marker = L.Wrld.marker([34.07271005818638, -118.39909435059153], {
      icon: myIcon,
      elevation: 50,
    }).addTo(map);

    marker.on('click', function() {
      props.changeRoute('/world/store');
    });
  }
}

function fly(position) {
  isLocationEnabled = true;
  showFlying(true);
  if (map != undefined) {
    setTimeout(function() {
      flyAnimation(
        [position.latitude, position.longitude],
        defaultZoom,
        3,
        function() {
          showFlying(false);
        }
      );
    }, 3000);
  }
}

function mouseDown(event) {
  mouseDownPoint = event.layerPoint;
}

function doubleClick(event) {
  if (map != undefined) {
    map.setView(event.latlng, maxZoom, {
      animate: true,
      duration: 3000,
    });
  }
}

function mouseUp(event) {
  if (event == null) return;
  if (mouseDownPoint == null) return;

  mouseUpPoint = event.layerPoint;
  var mouseMoved = mouseDownPoint.distanceTo(mouseUpPoint) > 5;

  if (!mouseMoved) {
    var latlng = event.latlng;

    if (isPickMode == true) {
      addPickModeAvatar(userAvatar, map.getCenter(), 50, 100, function() {});
    }
  }
}

function updatePopup() {
  if (isPickMode == true) {
    if (pickedGroup != undefined) {
      for (var i = 0; i < pickedGroup.length; i++) {
        pickedGroup[i].setLatLng(map.getCenter());
      }
    }
  }
}

function addPickModeAvatar(url, position, size, elevation, clicked) {
  if (map != undefined && isPickMode == true) {
    var marker = L.Wrld.marker(position).addTo(map);

    pickedGroup.push(marker);

    var myIcon = L.icon({
      iconUrl: url,
      iconSize: [size, size],
    });

    marker = L.Wrld.marker(position, {
      icon: myIcon,
      elevation: elevation,
    }).addTo(map);

    pickedGroup.push(marker);

    marker.on('click', clicked);
  }
}

function addLineAvatar(url, position, size, elevation, clicked) {
  if (map != undefined) {
    var myIcon = L.icon({
      iconUrl: '../../images/line.png',
      iconSize: [1, elevation],
    });

    L.Wrld.marker(position, {
      icon: myIcon,
    }).addTo(map);

    myIcon = L.icon({
      iconUrl: url,
      iconSize: [size, size],
    });

    var marker = L.Wrld.marker(position, {
      icon: myIcon,
      elevation: elevation,
    }).addTo(map);

    marker.on('click', clicked);

    return marker;
  }
}

function addPickAvatar(url, position, size, elevation, clicked) {
  if (map != undefined) {
    // var marker = L.Wrld.marker(position).addTo(map);

    var myIcon = L.icon({
      iconUrl: url,
      iconSize: [size, size],
    });

    var marker = L.Wrld.marker(position, {
      icon: myIcon,
      elevation: elevation,
    }).addTo(map);

    marker.on('click', clicked);

    return marker;
  }
}

function addAvatar(url, position, size, elevation, clicked) {
  if (map != undefined) {
    var myIcon = L.icon({
      iconUrl: url,
      iconSize: [size, size],
    });

    var marker = L.Wrld.marker(position, {
      icon: myIcon,
      elevation: elevation,
    }).addTo(map);

    marker.on('click', clicked);

    return marker;
  }
}

function removeAll() {
  var length = components.length;
  var i = 0;

  if (map != undefined) {
    for (i = 0; i < length; i++) {
      components[i].remove();
    }
  }
}

export function main(prop, callback) {
  props = prop;
  var tempuser = user;
  user = cookie.load('user');
  userName = user.user.username;
  //viewer init

  if (user.facebooklogin) {
    userAvatar = user.avatar;
  } else if (user.user.noGravatar) {
    userAvatar =
      'https://www.gravatar.com/avatar/' +
      undefined +
      '?d=https://clara.io/img/default_avatar.png';
  } else {
    userAvatar =
      'https://www.gravatar.com/avatar/' +
      user.user.gravatarHash +
      '?d=https://clara.io/img/default_avatar.png';
  }

  if (typeof callback !== 'undefined') {
    if (tempuser != null && tempuser.user.username == user.user.username) {
      if (viewContainer != null && map != null) {
        callback(true);
        document.getElementById('previewContent').appendChild(viewContainer);
        var container = L.Wrld.getMapById(0);
        if (container != undefined) {
          viewContainer.appendChild(container.mapContainer.mapContainer);
        }
        return;
      }
    }
  }

  if (viewContainer != null && map != null) {
    document.getElementById('previewContent').appendChild(viewContainer);
    var container = L.Wrld.getMapById(0);
    if (container != undefined) {
      viewContainer.appendChild(container.mapContainer.mapContainer);
    }
  } else {
    viewContainer = document.createElement('div');
    viewContainer.id = 'map';
    document.getElementById('previewContent').appendChild(viewContainer);
    map = L.Wrld.map('map', '8adf5f37ea4ec1a430c30110c436b9f7', {
      center: [40.7484405, -73.9862116],
      zoom: 3,
    });
  }

  var input = document.getElementById('searchInput');

  var autocomplete = new google.maps.places.Autocomplete(input);

  autocomplete.addListener('place_changed', function() {
    var place = autocomplete.getPlace();
    if (place != undefined && place.geometry != undefined) {
      var geometry = place.geometry.location;
      flyAnimation(
        [geometry.lat(), geometry.lng()],
        defaultZoom,
        3,
        function() {
          showFlying(false);
        }
      );
    }
  });

  jQuery('#searchInput').on('input', function(e) {
    var value = $(this).val();
    if (value != '') {
      jQuery('#clear_input').css('display', 'block');
    } else {
      jQuery('#clear_input').css('display', 'none');
    }
  });

  jQuery('#clear_input').click(function(event) {
    //Do stuff when clicked
    jQuery('#searchInput').val('');
    jQuery('#clear_input').css('display', 'none');
  });

  map.on('mousedown', mouseDown);

  map.on('mouseup', mouseUp);

  map.on('dblclick', doubleClick);

  map.on('update', updatePopup);

  var preLoad = function(success) {
    if (success) {
      console.log('success');
    } else {
      console.log('failed');
    }
  };

  map.precache([34.067806, -118.401345], 2000, preLoad);

  if (typeof callback === 'undefined') {
    return;
  }

  sceneInfoList = [];

  fetch('/stations/', {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  }).then(function(response) {
    response.json().then(function(result) {
      var json = result;
      var info = [];
      for (var i in json.models) {
        if (json.models[i] && json.models[i].tags[0] === 'freevi') {
          var rotation = 0;
          if (json.models[i].metadata != undefined)
            rotation = json.models[i].metadata.rotation;
          var obj = {
            title: json.models[i].name,
            author: json.models[i].owner,
            ownername: json.models[i].user.username,
            rotation: rotation,
            sceneId: json.models[i].id,
            thumbnail: 'thumbnail.jpg',
            visibility: json.models[i].visibility,
            geolocation: json.models[i].geolocation.coordinates,
          };

          sceneInfoList.push(obj);
          // console.log("Json Object:", json.models[i]);
          // console.log("Object:", obj);
          /* added for alpha version */
          if (json.models[i].owner == user.user.username) {
            myStationGeo = json.models[i].geolocation.coordinates;
          }
        }
      }

      navigator.geolocation.getCurrentPosition(
        function(position) {
          loadScene(function() {
            fly(position.coords);
            callback(true);
          });
        },
        function() {
          jQuery.ajax({
            url: 'https://freegeoip.net/json',

            jsonp: 'callback',

            dataType: 'jsonp',

            success: function(response) {
              loadScene(function() {
                fly(response);
                callback(true);
              });
            },
            error: function(error) {
              isLocationEnabled = false;
            },
          });
        }
      );
    });
  });
}
