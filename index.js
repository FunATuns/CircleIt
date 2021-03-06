// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var items = require("./items.json");
var gwidth = 4800;
var gheight = 4800;
var port = process.env.PORT || 7777;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});



// Routing
app.use(express.static(__dirname + '/public'));


setInterval(function () {
  if(players.length > 0){
    
    players.forEach(movePlayer);
  }
},1000/30);

setInterval(function () {
  if(players.length > 0){
    
    players.forEach(sendUpdate);
  }
},1000/30);

setInterval(function () {
  if(objects.length > 0){
    
    objects.forEach(objectTick);
  }
},1000/30);

var numUsers = 0;
var players = [];
var objects = [];
var buildings = [];

io.on('connection', function (socket) {

  socket.on('Joined', function (data) {
    var bip = newplayer(socket.id,data);
    players.push(bip);
    socket.emit("InvUpdate", bip.inventory);
    io.emit('Buildings', buildings);
  });

  socket.on('SendControls', function (data) {
    var noo = getPlayerById(socket.id);
    if(noo)
    noo.move = data;
  });

  socket.on("TextMsg", function(name, msg){
    io.emit("PostMsg", name, msg);
  });

  socket.on('InvSwitch', function (slot1,slot2) {
    var invPlayer = getPlayerById(socket.id);
    if(invPlayer) {
      invPlayer.inventory.inv.swap(slot1,slot2);
      socket.emit("InvUpdate", invPlayer.inventory);
    }
  });

  socket.on('InvEquip', function (slot) {
    var invPlayer = getPlayerById(socket.id);
    if(invPlayer) {
      if(invPlayer.inventory.inv[slot].id != "" ) {
        if(invPlayer.inventory.inv[slot].type == "weapon" || invPlayer.inventory.inv[slot].type == "misc" || invPlayer.inventory.inv[slot].type == "armor" || invPlayer.inventory.inv[slot].type == "tool") {
          var theType = invPlayer.inventory.inv[slot].type;
          var hold = invPlayer.inventory.inv[slot];
          invPlayer.inventory.inv[slot] = invPlayer.inventory[theType];
          invPlayer.inventory[theType] = hold;
        }
      }
      socket.emit("InvUpdate", invPlayer.inventory);
    }
  });

  socket.on('InvDrop', function (slot) {
    var invPlayer = getPlayerById(socket.id);
    if(invPlayer) {
      if(invPlayer.inventory.inv[slot].id != "") {
        dropItem(invPlayer.inventory.inv[slot].id, invPlayer.inventory.inv[slot].stack, invPlayer.x, invPlayer.y);
        invPlayer.inventory.inv[slot] = items.nothing;
      }
      socket.emit("InvUpdate", invPlayer.inventory);
    }
  });

  socket.on('disconnect', function () {
    for (i = 0; i < players.length; i++) { 
      if(players[i].id == socket.id) {
        socket.broadcast.emit('Rip', players[i].cid);
        players.splice(i, 1);
      }
    }
  });
});


function newplayer (id,name) {
  return {
    x: 400,
    y: 200,
    r: 13,
    team: 256,
    name: name, 
    type: "player",
    id: id,
    cid: keyGen(),
    vx: 0,
    vy: 0,
    inventory: {
      weapon: items.woodsword,
      misc: items.woodnecklace,
      tool: items.woodtool,
      armor: items.nothing,
      inv:  [items.nothing,items.stonesword,items.woodsword,items.nothing,items.nothing,items.nothing,items.nothing,items.nothing]
    },
    stats: {
      speed: .5,
      health: 2,
      MaxSpeed: 1,
      MaxHealth: 2,
      exp: 0,
      lvl: 0,
    },
    slash: {
      slashCharge: 0,
      slashMax: 30,
      slashing: false,
      slashTime: 0,
      hits: [],
    },
    shoot: {
      shootCharge: 0,
      shootMax: 30
    },
    mine: {
      mine:0,
      mineMax: 15,
    },
    move: {},
  };
}

function getPlayerById(id){
  for (i = 0; i < players.length; i++) { 
    if(players[i].id == id)
    {
      return players[i];
    }
  }
}

function getObjectByCID(cid){
  for (i = 0; i < objects.length; i++) { 
    if(objects[i].cid == cid)
    {
      return objects[i];
    }
  }
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getPlayersInBox(x,y,w,h) {
  var found = []
  for (i = 0; i < players.length; i++) { 
    var player = players[i];
    if(player.x + player.r >= x && player.x - player.r <= x + w) {
      if(player.y + player.r >= y && player.y - player.r <= y + h) {
        found.push(player);
      }
    }
  }
  return found;
}

function getObjectsInBox(x,y,w,h) {
  var found = []
  for (i = 0; i < objects.length; i++) { 
    var obj = objects[i];
    if(obj.x + obj.r >= x && obj.x - obj.r <= x + w) {
      if(obj.y + obj.r >= y && obj.y - obj.r <= y + h) {
        found.push(obj);
      }
    }
  }
  return found;
}

function sendUpdate(boop) {
  var results = getPlayersInBox(boop.x-1000,boop.y-500,2000,1000);
  var resultObj = getObjectsInBox(boop.x-1000,boop.y-500,2000,1000);

  for(var i in results) {
    if(results[i].id == boop.id)
    {
      results.splice(i, 1);
    }
  }
  for(var i in results) {
    results[i] = trimPlayer(results[i]);
  }
  io.to(boop.id).emit('ViewUpdate', boop, results,resultObj);

}

function trimPlayer(player) {
  if(player.type == "player") {
    return  {
      x: player.x,
      y: player.y,
      r: player.r,
      cid: player.cid,
      slash: player.slash,
      mine: player.mine,
      name: player.name,
      type: player.type
    };
  }
  else if(player.type == "object") 
    return player;
}

function movePlayer(boop) {
  if(boop.stats.health > 0) {
    if(boop.move.mouse1) {
      boop.slash.slashCharge = Math.min(boop.slash.slashCharge + 1, boop.slash.slashMax);
      boop.stats.speed *= .6;
    }
    else if (!boop.move.mouse1 && boop.slash.slashCharge  >= boop.slash.slashMax) {
      addForce(boop, boop.move.angle, 10);
      boop.slash.slashTime = 10;
      boop.slash.slashing = true;
      boop.slash.slashCharge = 0;

    }
    else if (!boop.move.mouse1)
      boop.slash.slashCharge = 0;

    if(boop.slash.slashing) {
      boop.slash.slashTime -= 1;

      if(boop.slash.slashTime <= 0) {
        boop.slash.slashing = false;
        boop.slash.slashTime = 0;
        boop.slash.hits = [];
      }
    }

    if(boop.move.c && !boop.move.mouse1) {
      if(getDistance(boop.x , boop.y , boop.move.mouseX , boop.move.mouseY ) < 80) {
        var theObject = getItemAtPoint(boop.move.mouseX, boop.move.mouseY);
        if(theObject) {
          console.log(theObject);
          for(var i = 0; i < boop.inventory.inv.length; i++) {
            if(boop.inventory.inv[i].id == "") {
              boop.inventory.inv[i] = items[theObject.itemType];
              boop.inventory.inv[i].stack = theObject.amount;

              destroyObject(theObject);

              io.to(boop.id).emit("InvUpdate", boop.inventory);
              break;
            }
          }
        }
        
      }
    }

    if(boop.move.up) boop.vy -= boop.stats.speed;
    if(boop.move.left) boop.vx -= boop.stats.speed;
    if(boop.move.right) boop.vx += boop.stats.speed;
    if(boop.move.down) boop.vy += boop.stats.speed;

    boop.stats.speed = boop.stats.MaxSpeed;

    var leftEdge = Math.floor((-boop.r + boop.x)/32);
    var rightEdge = Math.floor((boop.r + boop.x)/32);
    var topEdge = Math.floor((-boop.r + boop.y)/32);
    var bottomEdge = Math.floor((boop.r + boop.y)/32);
  
    if(boop.vx > 0) {
      var t = getBuildingCollision(rightEdge + 1 ,topEdge);
      var b = getBuildingCollision(rightEdge + 1,bottomEdge);
  
      if(t || b) {
        if(boop.x + boop.vx + boop.r > ((rightEdge )*32) + 32 ) {
          boop.vx = Math.min((((rightEdge )*32) + 32) - (boop.x + boop.r ),0);
        }
      }
    }
    else if(boop.vx < 0) {
      var t = getBuildingCollision(leftEdge - 1 ,topEdge);
      var b = getBuildingCollision(leftEdge - 1,bottomEdge);
  
      if(t || b) {
        if(boop.x + boop.vx - boop.r < ((leftEdge)*32) ) {
          boop.vx = Math.min((((leftEdge)*32)  ) - boop.x + boop.r ,0);
        }
      }
    }
  
    if(boop.vy > 0) {
      var r = getBuildingCollision(rightEdge ,bottomEdge + 1);
      var l = getBuildingCollision(leftEdge,bottomEdge + 1);
  
      if(r || l) {
        if(boop.y + boop.vy + boop.r > ((bottomEdge)*32)+32) {
          boop.vy = Math.min((((bottomEdge)*32)+32) - (boop.y + boop.r ),0);
        }
      }
    }
    else if(boop.vy < 0) {
      var r = getBuildingCollision(rightEdge ,topEdge - 1);
      var l = getBuildingCollision(leftEdge,topEdge -1 );
  
      if(r || l) {
        if(boop.y + boop.vy - boop.r  < ((topEdge)*32)  ) {
          boop.vy = Math.min((((topEdge)*32)  ) - boop.y + boop.r,0);
        }
      }
    }

    if(getBuildingCollision(rightEdge,topEdge) || getBuildingCollision(rightEdge,bottomEdge)) {
      if(boop.vx > 0) {
        boop.vx = 0;
      }
    }

    if(getBuildingCollision(leftEdge,topEdge) || getBuildingCollision(leftEdge,bottomEdge)) {
      if(boop.vx < 0) {
        boop.vx = 0;
      }
    }

    if(boop.x + boop.vx + boop.r < 4800 && boop.x + boop.vx - boop.r  > 0)
      boop.x += boop.vx;
    else if (boop.x + boop.vx + boop.r > 4800)
    {
      boop.vx = 4800 - (boop.x + boop.r);
      boop.x += boop.vx;
    }
    else if (boop.x + boop.vx - boop.r  < 0)
    {
      boop.vx = -boop.x + boop.r;
      boop.x += boop.vx;
    }
  
    if(boop.y + boop.vy + boop.r < 4800 && boop.y + boop.vy - boop.r > 0)
      boop.y += boop.vy;
    else if (boop.y + boop.vy + boop.r > 4800)
    {
      boop.vy = 4800 - (boop.y + boop.r);
      boop.y += boop.vy;
    }
    else if (boop.y + boop.vy - boop.r < 0)
    {
      boop.vy = -boop.y + boop.r;
      boop.y += boop.vy;
    }

    
    boop.vy *= 0.85;
    boop.vx *= 0.85;

    var results = getCircleCollision(boop.x,boop.y,boop.r);

    for(var i in results) {
      if(results[i].type == "player") {
        var bip = getPlayerById(results[i].id);
        if( bip && bip.cid == boop.cid) {

        }
        else {
          if((boop.slash.slashing && !bip.slash.slashing) || (boop.slash.slashing && boop.slash.slashTime < bip.slash.slashTime )) {
            
            if(boop.slash.hits.includes(bip.cid)) {

            }
            else {
              var angle = Math.atan2(bip.y-boop.y,bip.x-boop.x);

              bip.slash.slashCharge = 0;
              bip.slash.slashTime = 0;

              addForce(bip,angle,10);

              bip.stats.health -= 1;

              boop.slash.hits.push(bip.cid);

            }
          }
        }
      }
      else if(results[i].type == "object") {
        var bip = getObjectByCID(results[i].cid);

        if( bip && bip.cid == boop.cid) {

        }
        else if (bip){
          if(bip.name == "exp") {
            destroyObject(bip);
            createExp();
            giveExp(boop,1);
          }
          else if(bip.name == "cannonball") {

            var hit = getVelocity(bip.x+(bip.w*.5), bip.y+(bip.h*.5), boop.x +10, boop.y + 10, 25);

            boop.vx += hit.x;
            boop.vy += hit.y;

            boop.stats.health -= 1;
            destroyObject(bip);
          }
        }
      }
    }
  }
  else {
    io.sockets.connected[boop.id].disconnect();
    for (i = 0; i < players.length; i++) { 
      if(boop.id == players[i].id) {
        players.splice(i, 1);
      }
    }
    
  }
}

function getCircleCollision(x,y,r) {
  var found = [];
  for(var i = 0; i < players.length; i++) {
    var player = players[i];
    if(getDistance(player.x , player.y , x , y) <= player.r + r) {
      found.push(player);
    }
  }

  return found;
}

function getItemAtPoint(x,y) {
  for(var i = 0; i < objects.length; i++) { 
    if(getDistance(x , y , objects[i].x , objects[i].y) <= objects[i].r && objects[i].name == "item") {
      return objects[i];
    }
  }
}

function giveExp(player,exp ) {
  player.stats.exp += exp;

  if(player.stats.exp >= getExpMax(player.stats.lvl)) {
    player.stats.exp -= getExpMax(player.stats.lvl);
    player.stats.lvl += 1;

    giveExp(player,0);
  }
}

function getExpMax(lvl) {
  return Math.floor(Math.sqrt(60*lvl) + 19);
}

function keyGen() {
  return Date.now() + String(getRandomInt(1,100)) + String(getRandomInt(1,100)) + String(getRandomInt(1,100));
}

function getMinePosition(player,move) {
  if(getDistance(player.x + 10, player.y + 10, move.mouseX , move.mouseY ) < 80) {
    return {x: move.mouseX ,y:move.mouseY };
  }
  else {
    var realx = 80*Math.cos(move.angle);
    var realy = 80*Math.sin(move.angle);
    return {x: player.x + realx + 10,y:player.y + realy + 10};
  }
}

function getBuildingAtLocation(x,y) {
  for(var i in buildings) {
    if(buildings[i].x == x && buildings[i].y == y) {
      return buildings[i];
    }
  }
  return {};
}

function mineBuilding(player,building) {
  if(building.health <= 0) {
    destroyBuilding(building);
  }
  io.emit('Buildings', buildings);
}

function getBuildingCollision(x,y) {
  var building = getBuildingAtLocation(x,y);
  if(building && building.collidable) {
    return true;
  }
}

function buildBuilding(x, y) {
  var building =  {
    x: x,
    y: y,
    cid: keyGen(),
    name: "cannon",
    health: 10,
    maxHealth: 10,
    team: 255,
    collidable: true,
    needsTick: true,
    cannon: {
      reload: 0,
      reloadMax: 4,

    }
  }

  buildings.push(building);

  io.emit('Buildings', buildings);
}

function getDistance(x1,y1, x2,y2) {
  var dist = Math.sqrt(Math.pow(x2-x1,2) + Math.pow(y2-y1,2));
  return dist;
}




var MAXEXP = 100;

function generateExp() {
  for(var o = 0; o < MAXEXP; o++) {
    createExp();
  }
}

function addForce(bip, angle,strength) {
  bip.vx += Math.cos(angle) * strength;
  bip.vy += Math.sin(angle) * strength;
}

function createProjectile(team,velocity,position,name,lifetime) {
  var obj = {
    x: position.x,
    y: position.y,
    w: 5,
    h: 5,
    velocity: velocity,
    lifetime: lifetime,
    cid: keyGen(),
    name: name,
    type: "object"
  };

  objects.push(obj);
}

function createExp() {
  var x = getRandomInt(30,gwidth - 30);
  var y = getRandomInt(30,gheight - 30);

  var obj = {
    x: x,
    y: y,
    w: 10,
    h: 10,
    cid: keyGen(),
    name: "exp",
    type: "object"
  };

  objects.push(obj);
}

function dropItem(id, amount, x, y) {
  var obj = {
    x: x,
    y: y,
    r: 12,
    lifetime: 30*30,
    itemType: id,
    amount: amount,
    cid: keyGen(),
    name: "item",
    type: "object"
  };

  objects.push(obj);
}

function objectTick(object) {
  if(object.lifetime) {
    
    object.lifetime -= 1;
    if(object.lifetime <= 0) {
      destroyObject(object);
      return;
    }
  }

  if(object.velocity ) {
    
    if(object.x + object.velocity.x < 0 || object.x + object.velocity.x + object.w > gwidth ||
      object.y + object.velocity.y < 0 || object.y + object.velocity.y + object.h > gheight ) {
      
      destroyObject(object);
      return;
    }

    object.x += object.velocity.x;
    object.y += object.velocity.y;
  }

  
}

function buildingTick(building) {
  if(building.needsTick ) {
    if(building.name == "cannon") {
      if(building.cannon.reload > 0) {
        building.cannon.reload -= 1;
      }

      var results = [];

      for(var i in results) {
        var thing = results[i];
        if(thing.type == "player" && thing.team != building.team && building.cannon.reload == 0) {
          var velocity = getVelocity((building.x*32)+16,(building.y*32)+16, thing.x + 10, thing.y + 10,10);
          createProjectile(building.team,velocity,{
            x: (building.x*32)+16,
            y: (building.y*32)+16
          },"cannonball",30 * 3);
        }
      }
    }
  }
}

function getVelocity(x1,y1,x2,y2,multiplier) {
  var realx = x2 - x1;
  var realy = y2 - y1;

  var angle = Math.atan2(realy ,realx );

  var velocity = {
    x: multiplier*Math.cos(angle),
    y: multiplier*Math.sin(angle),
  };
  return velocity;
}

function destroyObject (obj) {
  for (i = 0; i < objects.length; i++) { 
    if(objects[i].cid == obj.cid) {
      objects.splice(i, 1);
    }
  }
}

function destroyBuilding (building) {
  if(!building) {
    return;
  }
  for (i = 0; i < buildings.length; i++) {
    if(buildings[i].cid == building.cid) {
      buildings.splice(i, 1);
      return;
    }
  }
}

Array.prototype.swap = function (x,y) {
  var b = this[x];
  this[x] = this[y];
  this[y] = b;
  return this;
}

// World Generation

var maxTrees = 300;
var maxRockVeins = 20;

var rockCenters = [];

function buildWorld()  {
  generateTrees();
  generateRockVeins();
}

function generateTrees() {
  for(var o = 0; o < maxTrees; o++) {
    var x = getRandomInt(1,149);
    var y = getRandomInt(1,149);

    if(getBuildingAtLocation(x,y) !== {}) {
      createTree(x,y);
    }
  }
}

function createTree(x, y) {
  console.log(keyGen());
  var building =  {
    x: x,
    y: y,
    cid: keyGen(),
    name: "tree",
    collidable: true,
    team: 255,
    health: 10,
    maxHealth: 10
  }

  buildings.push(building);

  io.emit('Buildings', buildings);
}

function generateRockVeins() {
  for( var i = 0; i < maxRockVeins; i++) {
    rockCenters.push({x:getRandomInt(0,gwidth),y: getRandomInt(0, gheight)});
  }
  console.log(rockCenters);

  for(var i = 0; i < gwidth/32; i++) {
    for(var j = 0; j < gheight/32; j++) {
      var theX = (i*32) + 16;
      var theY = (j*32) + 16;
      for(var o = 0; o < rockCenters.length; o++) {
        if(getDistance(theX,theY, rockCenters[o].x, rockCenters[o].y) < 45 ){
          placeNaturalBuilding(i,j,"rock");
        }
      }
    }
  }
}

function placeNaturalBuilding(x, y, name) {
  var currentBuilding = getBuildingAtLocation(x,y);
  destroyBuilding(currentBuilding);

  var building =  {
    x: x,
    y: y,
    cid: keyGen(),
    name: name,
    health: 10,
    maxHealth: 10,
    team: 255,
    collidable: true,
    needsTick: true,
  }

  buildings.push(building);
   io.emit('Buildings', buildings);
}

buildWorld();