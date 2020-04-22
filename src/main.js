require('./main.css');
var mustacheRender = require('mustache').render;
var d3 = require("d3");
var firebase = require("firebase");
var max_record_count = 500;

initFirebase();

getUid(function (uid) {
  // use uid for login check
  if (!uid) {
    if (confirm("You are not logged in. Log in now?")) {
      login();
    } else {
      d3.select('#chart-container').remove();
      d3.select('div.container-fluid').append("<h4>Need to Log In. Refresh page to try again.</h4>");
      return false;
    }
  } else {
    initChart();
  }
});

function initFirebase() {
  // Initialize Firebase
  var config = {
    apiKey: "AIzaSyAIVmy8lz8DUk7BdREHqHESGoGKNq4or2U",
    authDomain: "realtime-temp-and-rh.firebaseapp.com",
    databaseURL: "https://realtime-temp-and-rh.firebaseio.com",
    projectId: "realtime-temp-and-rh",
    storageBucket: "realtime-temp-and-rh.appspot.com",
    messagingSenderId: "1036067871339"
  };
  firebase.initializeApp(config);
}

function login() {
  var provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({
    'login_hint': 'fangzilu@gmail.com'
  });
  firebase.auth().signInWithRedirect(provider);
}

function getUid(next_func) {
  firebase.auth().onAuthStateChanged(function (user) {
    if (user && user.uid) {
      next_func(user.uid);
    } else {
      // No user is signed in.
      //// check firebase
      firebase.auth().getRedirectResult().then(function (result) {
        if (result.credential) {
          // This gives you a Google Access Token. You can use it to access the Google API.
          var token = result.credential.accessToken;
        }
        // The signed-in user info.
        var user = result.user;
        console.info("user", user);
        console.info("token", token);
        if (user && user.uid) {
          var uid = user.uid;
          return next_func(uid);
        } else {
          // need login
          return next_func(false);
        }
      }).catch(function (error) {
        // Handle Errors here.
        console.error("errorCode", error.code);
        console.error("errorMessage", error.message);
        // The email of the user's account used.
        console.error("email", error.email);
        // The firebase.auth.AuthCredential type that was used.
        console.error("credential", error.credential);
        return next_func(false);
      });
    }
  });
}

function initChart() {

  var db_ref = firebase.database().ref('records').limitToLast(max_record_count);

  db_ref.on('child_added', function (data) {
    var { TS, T_C, RH, AC } = data.val();
    var newPoint = {
      time: parseTS(TS),
      temp: T_C,
      RH: RH,
      AC: AC
    };
    updateLatestDataDisplay(newPoint);
    addPoint(newPoint);
  });
}

// initialize d3
var data = [];
var height = 400;
var width = parseFloat(d3.select("#chart-container").style("width"));

var chart = d3.select('#chart')
  .attr('width', width)
  .attr('height', height);
var margin = { top: 10, left: 35, bottom: 25, right: 35 };
var x = d3.scaleTime().range([margin.left, width - margin.right]);
var y_temp = d3.scaleLinear().domain([20, 40]).range([height - margin.bottom, margin.top]);
var y_RH = d3.scaleLinear().domain([30, 99]).range([height - margin.bottom, margin.top]);
var y_AC = d3.scaleLinear().domain([-2, 2]).range([height - margin.bottom, margin.top]);
// -----------------------------------
var temp_line = d3.line().curve(d3.curveCardinal)
  .x(function (d) {
    return x(d.time);
  })
  .y(function (d) {
    return y_temp(d.temp);
  });

var RH_line = d3.line().curve(d3.curveCardinal)
  .x(function (d) {
    return x(d.time);
  })
  .y(function (d) {
    return y_RH(d.RH);
  });

var AC_line = d3.line().curve(d3.curveStep)
  .x(function (d) {
    return x(d.time);
  })
  .y(function (d) {
    return y_AC(d.AC);
  });

// -----------------------------------
// Draw the axis
var xAxis = d3.axisBottom().scale(x),
  yAxis_temp = d3.axisLeft(y_temp).tickFormat(d3.format('.1f')),
  yAxis_RH = d3.axisRight(y_RH).tickFormat(d3.format('.1f'));
var axisX = chart.append('g').attr('class', 'x axis')
  .attr('transform', 'translate(0, ' + (height - margin.bottom) + ')')
  .call(xAxis);
var axisY_temp = chart.append("g").attr('class', 'y axis temp').attr('transform', 'translate(' + margin.right + ',0)').call(yAxis_temp);
var axisY_RH = chart.append("g").attr('class', 'y axis RH').attr('transform', 'translate(' + (width - margin.right) + ',0)').call(yAxis_RH);

// Append the holder for line chart
var path_temp = chart.append('path').classed("temp", true),
  path_RH = chart.append('path').classed("RH", true),
  path_AC = chart.append('path').classed("AC", true);

function parseTS(ts) {
  return new Date(ts * 1000);
}

function addPoint(record) {
  data.push(record);

  // Shift the chart left
  x.domain([data[0].time, data.slice(-1)[0].time]);
  axisX.call(xAxis);

  // Draw new line
  path_temp.datum(data)
    .attr('class', 'temp-line')
    .attr('d', temp_line);

  path_RH.datum(data)
    .attr('class', 'RH-line')
    .attr('d', RH_line);

  path_AC.datum(data)
    .attr('class', 'AC-line')
    .attr('d', AC_line);

  var domain_margin = 2;
  y_temp.domain([d3.min(data, function (d) {
    return d['temp'] - domain_margin
  }), d3.max(data, function (d) {
    return d['temp'] + domain_margin
  })]);
  y_RH.domain([d3.min(data, function (d) {
    return d['RH'] - domain_margin
  }), d3.max(data, function (d) {
    return d['RH'] + domain_margin
  })]);

  axisY_temp.call(yAxis_temp);
  axisY_RH.call(yAxis_RH);

  // Remove old data (max 50 points)
  if (data.length >= max_record_count) data.shift();
}

function updateLatestDataDisplay(newPoint) {
  var template = document.getElementById('latest-data-template').innerHTML;
  newPoint = { time: newPoint.time.toLocaleString(), temp: newPoint.temp, RH: newPoint.RH, AC: newPoint.AC };
  var rendered = mustacheRender(template, newPoint);
  document.getElementById('latest-data').innerHTML = rendered;
}