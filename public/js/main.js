var socket = io.connect("http://127.0.0.1:7777");



var offsetx = window.innerWidth/2;
var offsety = window.innerHeight/2;
var chargeanimbar = document.getElementById("chargebackbar");
var healthanimbar = document.getElementById("healthbackbar");
var expanimbar = document.getElementById("expbackbar");
var help = false;

var buildings = [];
var players = [];
var objects = [];

var myplayer = {
  anim: {
    tick: 0,
    frame: 0,
    facingLeft: false
  },
};

var move = {
  up: false,
  down: false,
  right: false,
  left: false,
  mouse1: false,
  c: false,
  e: false,
  angle: 0
}

window.onmousemove = function(e) {
  var mousex = e.clientX - offsetx ;
  var mousey = e.clientY - offsety ;
  var angle = Math.atan2(mousey ,mousex );
  move.angle = angle;

  move.mouseX = mousex + myplayer.x;
  move.mouseY = mousey + myplayer.y;
}

window.onmousedown = function(e) {
  move.mouse1 = true;
}

window.onmouseup = function(e) {
  move.mouse1 = false;
}


window.onkeydown = function(e){
  if(!$("#textmes").is(':focus')){
    if(e.keyCode == 87) {
      move.up = true;
    }

    if(e.keyCode == 83) {
      move.down = true;
    }

    if(e.keyCode == 68) {
      move.right = true;
    }

    if(e.keyCode == 65) {
      move.left = true;
    }

    if(e.keyCode == 49) {
      move.one = true;
    }

    if(e.keyCode == 69) {
      move.e = true;
    }

    if(e.keyCode == 67) {
      move.c = true;
    }
  }
};

window.onkeyup = function(e){
  if(e.keyCode == 87) {
    move.up = false;
  }

  if(e.keyCode == 83) {
    move.down = false;
  }

  if(e.keyCode == 68) {
    move.right = false;
  }

  if(e.keyCode == 65) {
    move.left = false;
  }

  if(e.keyCode == 49) {
    move.one = false;
  }

  if(e.keyCode == 69) {
    move.e = false;
  }

  if(e.keyCode == 67) {
    move.c = false;
  }
};

$("#go").click(function (){
  sessionStorage.setItem("username", document.getElementById("name").value)
  socket.emit('Joined',document.getElementById("name").value);
  document.getElementById("nameOverlay").style.display = "none";
  document.getElementById("myplayerstats").style.display = "block";
});

var tree;
function setup() {
  var canvas = createCanvas($(window).width(), $(window).height());
  fill(255);
  frameRate(60);
  tree = loadImage("sprites/treeLarge.png"); 
}

function draw() {
  background(0);
  
  drawgrid();
  drawBuildings();
  stroke(255);
  fill(255);
  line(offsetx - myplayer.x,0,offsetx - myplayer.x,offsety*2);
  line(offsetx + (4800 -myplayer.x),0,offsetx + (4800 -myplayer.x),offsety*2);
  line(0,offsety - myplayer.y,offsetx*2,offsety - myplayer.y);
  line(0,offsety + (4800 - myplayer.y),offsetx*2,offsety + (4800 - myplayer.y));
  if(myplayer) {
    drawPlayer(offsetx,offsety ,myplayer);

    if(move.e) {
      stroke(255);
      fill(255);

      if(getDistance(offsetx , offsety , move.mouseX - myplayer.x + offsetx , move.mouseY - myplayer.y + offsety ) < 80) {
        line(offsetx , offsety , move.mouseX - myplayer.x+offsetx , move.mouseY - myplayer.y+offsety );
      }
      else {
        var realx = 80*Math.cos(move.angle);
        var realy = 80*Math.sin(move.angle);
        line(offsetx ,offsety,realx + offsetx   ,realy + offsety   );
      }
      
    }
  }
    
  for(var o in players) {
    var realx = players[o].x - myplayer.x + offsetx;
    var realy = players[o].y - myplayer.y + offsety;
    drawThing(realx ,realy ,players[o]);
  }

  for(var o in objects) {
    var realx = objects[o].x - myplayer.x + offsetx;
    var realy = objects[o].y - myplayer.y + offsety;
    drawThing(realx ,realy ,objects[o]);
  }
  
  if(myplayer.slash) {
    chargeanimbar.style.width = ((myplayer.slash.slashCharge / myplayer.slash.slashMax)*100) + "%";
  }
  if(myplayer.slash) {
    healthanimbar.style.width = ((myplayer.stats.health / myplayer.stats.MaxHealth)*100) + "%";
  }
  if(myplayer.stats) {
    expanimbar.style.width = ((myplayer.stats.exp / getExpMax(myplayer.stats.lvl))*100) + "%";
  }
    
  socket.emit('SendControls', move);
}

function drawgrid() {
  stroke(25,25,25);
  strokeWeight(2);
  for (var x = offsetx - myplayer.x; x < offsetx*2 + myplayer.x && x < offsetx - myplayer.x +  4800 ; x += 32) {
    if(x > 0 && x <offsetx*2)
      line(x,0,x,offsety*2);
  }  
  for (var y = offsety - myplayer.y; y < offsety*2 + myplayer.y && y < offsety - myplayer.y + 4800; y += 32) {
    if(y > 0 && y <offsety*2)
      line(0,y,offsetx *2,y);
  }  
}

function getExpMax(lvl) {
  return Math.floor(Math.sqrt(60*lvl) + 19);
}

function drawBuildings() {
  stroke(255);
  fill(255,255,255,40);
  for(var i in buildings) {
     var building = buildings[i];
     var actualX = building.x * 32;
     var actualY = building.y * 32;

     var realx = actualX - myplayer.x + offsetx;
     var realy = actualY - myplayer.y + offsety;

     if(Math.floor(move.mouseX/32) == building.x && Math.floor(move.mouseY/32) == building.y) {
        stroke(0,255,0);
        fill(0,255,0);
        rect(realx - 5, realy + 37, (building.health/building.maxHealth)*42,5);
     }

     

     if(realx > -32 && realx < offsetx*2 + 32 && realy > -32 && realy < offsety*2 + 32 ) {
       renderBuilding(building, realx, realy);
     }
    
  }
}

function renderBuilding (building, x, y) {
  if(building.name == "tree") {
    stroke(85,255,85,255);
    strokeWeight(2);
    fill(85,255,85,40);
    rect(x,y,32,32);
    image(tree,x , y + 2, 32, 32);

  }
  else if(building.name == "cannon") {
    stroke(255,255,255);
    fill(255,255,255,40);
    rect(x,y,32,32);
  }
  
}

function drawThing(x,y,thing) {
  if(thing.type == "player") drawPlayer(x,y,thing);
  if(thing.type == "object") drawObject(x,y,thing);
}

function drawObject(x,y,object) {
  if(object.name == "item") {
    stroke(255);
    fill(255,255,255,20);
    ellipse(x,y,object.r*2);
  }
  if(object.name == "exp") {
    stroke(255);
    fill(255,255,255,20);
    rect(x,y,10,10);
  }
  if(object.name == "cannonball") {
    console.log(object);
    stroke(255);
    fill(255,255,255);
    rect(x,y,5,5);
  }
}

function getDistance(x1,y1, x2,y2) {
  var dist = Math.sqrt(Math.pow(x2-x1,2) + Math.pow(y2-y1,2));
  return dist;
}

function drawPlayer(x,y,player) {
  stroke(255);
  fill(255);
  textSize(15);
  textAlign(CENTER);
  strokeWeight(.5);
  if(player.name)
    text(player.name,x,y-20);
  if(player.slash ) {
    stroke(0,100,100);
    fill(0,100,100);
    if(player.slash.slashCharge > 0) {
       rect(x - 15, y + 15, (player.slash.slashCharge/player.slash.slashMax)*30,5);

        if(player.slash.slashCharge == player.slash.slashMax) {
            stroke(0,0,255);
            fill(0,0,255);
           rect(x- 15, y + 15, (player.slash.slashCharge/player.slash.slashMax)*30,5);
        }
    }
    if(player.slash.slashing) {
        stroke(255,0,0);
        fill(255,0,0);
    }
    else
    {
        stroke(255);
        fill(255);
    }
    
  }

  ellipse(x,y,player.r*2);

  if(player.mine ) {
    stroke(0,120,0);
    fill(0,120,0);
    if(player.mine.mine > 0) {
       rect(x- 5, y + 25, (player.mine.mine/player.mine.mineMax)*30,5);
    }
  }
    

  scale(1,1);
}

socket.on('Rip', function(cid){
  for(var i in players) {
    if(players[i].cid == cid) {
      players.splice(i, 1);
    }
  }
});

socket.on('ViewUpdate', function(myplayers,playerss, objectss){
  Object.assign(myplayer,myplayers);
  
  players = playerss;
  objects = objectss;
  //playerss.forEach(updateOrPush);
});


socket.on('Buildings', function(data){
  buildings = data;
});

// Inventory

var selectedBox = "";

$(".invbox").click(function (event) {
  if(this.id.startsWith("inv")) {
    if(selectedBox == "") {
      selectedBox = this.id;
      $("#" + this.id).addClass("invselected");
      console.log(selectedBox);
    }
    else if(selectedBox == this.id) {
      selectedBox = "";
      $("#" + this.id).removeClass("invselected");
      console.log(selectedBox);
    }
    else if(selectedBox != this.id) {
      var num1 = Number(selectedBox.split("inv")[1]);
      var num2 = Number(this.id.split("inv")[1]);

      $("#" + selectedBox).removeClass("invselected");
      selectedBox = "";

      console.log("Switch " + num1 + "   " + num2);
      socket.emit("InvSwitch", num1, num2);
    }
  }
});

$(".invbox").contextmenu(function() {
  if(this.id.startsWith("inv")) {
    var num = Number(this.id.split("inv")[1]);
    socket.emit("InvDrop", num);
  }
});

function renderInv() {
  if(myplayer.inventory) {
    if(myplayer.inventory.weapon.name != "Nothing") {
      document.getElementById("myplayerweapon").style.backgroundImage = "url('sprites/" + myplayer.inventory.weapon.id + ".png')";
      var tooltip = document.getElementById("myplayerweapon").getElementsByClassName("invtooltip")[0];
      tooltip.innerHTML = myplayer.inventory.weapon.name;
    }
    else {
      document.getElementById("myplayerweapon").style.backgroundImage = "none";
    }

    if(myplayer.inventory.misc.name != "Nothing") {
      document.getElementById("myplayermisc").style.backgroundImage = "url('sprites/" + myplayer.inventory.misc.id + ".png')";
      var tooltip = document.getElementById("myplayermisc").getElementsByClassName("invtooltip")[0];
      tooltip.innerHTML = myplayer.inventory.misc.name;
    }
    else {
      document.getElementById("myplayermisc").style.backgroundImage = "none";
    }

    if(myplayer.inventory.tool.name != "Nothing") {
      document.getElementById("myplayertool").style.backgroundImage = "url('sprites/" + myplayer.inventory.tool.id + ".png')";
      var tooltip = document.getElementById("myplayertool").getElementsByClassName("invtooltip")[0];
      tooltip.innerHTML = myplayer.inventory.tool.name;
    }
    else {
      document.getElementById("myplayertool").style.backgroundImage = "none";
    }

    if(myplayer.inventory.armor.name != "Nothing") {
      document.getElementById("myplayerarmor").style.backgroundImage = "url('sprites/" + myplayer.inventory.armor.id + ".png')";
      var tooltip = document.getElementById("myplayerarmor").getElementsByClassName("invtooltip")[0];
      tooltip.innerHTML = myplayer.inventory.armor.name;
    }
    else {
      document.getElementById("myplayerarmor").style.backgroundImage = "none";
    }

    for(var i = 0; i < myplayer.inventory.inv.length; i++) {
      if(myplayer.inventory.inv[i].name != "Nothing") { 
        document.getElementById("inv" + i).style.backgroundImage = "url('sprites/" + myplayer.inventory.inv[i].id + ".png')";
        var tooltip = document.getElementById("inv" + i).getElementsByClassName("invtooltip")[0];
        tooltip.innerHTML = myplayer.inventory.inv[i].name;
      }
      else {
        document.getElementById("inv" + i).style.backgroundImage = "none";
      }
    }
  }
}

socket.on('InvUpdate', function(inventory){
  myplayer.inventory = inventory;
  renderInv();
});

function sendtxt(){
  socket.emit("TextMsg", sessionStorage.getItem("username"), $("#textmes").val());
  $("#textmes").val("");
}

socket.on("PostMsg", function(name, msg) {
  var d = new Date();
  var acthrs = 0;
  var ttt = "AM";
  if(d.getHours > 12){
    acthrs = d.getHours() - 12;
    ttt = "PM";
  }
  else {
    acthrs = d.getHours();
    ttt = "AM";
  }
  if(name == sessionStorage.getItem("username")){
    document.getElementById("chat").innerHTML += "<p class='msg'><span class='myname'>" + acthrs + ":" + d.getMinutes() + ttt + " " + name + ": </span><span class='actmsg'>" + msg + "</span></p>";
  }
  else {
    document.getElementById("chat").innerHTML += "<p class='msg'><span class='notmyname'>" + acthrs + ":" + d.getMinutes() + ttt + " " + name + ": </span><span class='actmsg'>" + msg + "</span></p>"
  }
  document.getElementById("chat").scrollTop = document.getElementById("chat").scrollHeight;
});

function toggleHelp(){
  if(!help) {
    document.getElementById("helpcnt").style.display = "block";
    document.getElementById("hlpoverlay").style.display = "block";
  }
  else {
    document.getElementById("helpcnt").style.display = "none";
    document.getElementById("hlpoverlay").style.display = "none";
  }
  help = !help;
}


/*dragElement(document.getElementById("mydiv"));

function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(elmnt.id + "header")) {
    // if present, the header is where you move the DIV from:
    document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV: 
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}
*/