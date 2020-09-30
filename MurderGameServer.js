(function () {   
    var PLAYERS_THRESHOLD = 2;
    var PLAYERS_MAX = 10;    
    var AVATAR_DISTANCE_THRESHOLD = 200;
    var CLUE_PICKUP_DISTANCE_THRESHOLD = 3;
    var SEARCH_RADIUS = 1000;
    var SEARCH_POSITION = { x: 0, y: 0, z: 0};
    var TOTAL_CLUES = 10;
    var CLUES_NEEDED_FOR_GUN = 5;
    var TOTAL_KNIVES = 10;
    var TOTAL_BULLETS =10;
    var RESET_TIME_MS = 1000;
    var MAX_SCORE = 20; // for "Kill20" gameMode
    var ROLE_MESSAGE_DURATION = 1; // seconds
    var GET_READY_MESSAGE = ["Get Ready","3","2","1","GO !!"];
    var GET_READY_DURATION = 1000; // miliseconds 
    var bubbleSize = 160; 
    var BATTLE_ROYAL_SPHERE_DIMENSION = { x: bubbleSize, y: bubbleSize, z: bubbleSize};    
    var startPlay = false;
    var isGameFinished = false;    
    //var LOCATION_ROOT_URL = "http://192.168.2.200/Murdergame/";
    var LOCATION_ROOT_URL = Script.resolvePath(".");   
    var timer;
    var myID;      
    var myPosition;   
    var murderLeftSignID;
    var murderRightSignID;
    var bubbleID;           
    var playerData = {"players": []}; 
    var playersMerged = "";     
    var spawnPointIDs = [];
    var spawnPointPositions = [];
    var playerStartPositions = [];
    var itemPointIDs = [];
    var clueIDs = [];
    var knifeIDs = [];    
    var isEquipped = false;    
    var reset;
    var roleNumber = 0;
    var gameModes = ["MurderGame","LastMan","Kill20","BattleRoyal"];
    var gameModeCounter = 1;
    var gameMode = "MurderGame";
    var rightSign = gameMode;  
    var isVisible = false;   

    this.remotelyCallable = [
        "receiveDataFromItem",
        "receiveGun",
        "receiveKnife",
        "toggleVisibility"             
    ]; 

    this.preload = function (entityID) {       
        myID = entityID;
        myPosition = Entities.getEntityProperties(myID,"position").position;              
        Entities.editEntity(myID,{ script: LOCATION_ROOT_URL + "MurderGameClient.js?" + Date.now()});        
        deleteExistingItems(); 
        updateRightSign(); 
        updateLeftSign();                    
    };   
    
    this.unload = function (entityID) {        
        deleteExistingItems();    
    };

    // main communication between client script and serverscript
    this.receiveDataFromItem = function(id,param) {       
        var playerID = Uuid.fromString(param[0]);
        var itemID = Uuid.fromString(param[1]);
        var itemName = param[2];
        var data = param[3]; // string

        print("received from " + itemName + "with id " + itemID + "the playerID" + playerID + "data" + JSON.stringify(data));
       
        if (!isGameFinished && startPlay) {  
            for (var i = 0; i < playerData.players.length; i++) {                     
                if (playerData.players[i].id === playerID) {

                    // Murderer

                    if (playerData.players[i].role === "Murderer") {
                        var tempName = itemName;
                        var removeNumberName = tempName.slice(0,15);                        
                        if (removeNumberName === "MurderGameKnife" && isEquipped === false) {                            
                            isEquipped = true;                            
                            playSoundEffect(playerData.players[i].id,"swoosh");   
                            Entities.callEntityClientMethod(playerData.players[i].id,              
                                myID, 
                                "equipKnife",
                                ["allowed"] );                        
                        }                    
                        if (itemName === "MurderGameWeapon" && isEquipped === true) {
                            print ("Dropping knife...");
                            isEquipped = false;
                            playSoundEffect(playerData.players[i].id,"swoosh");                             
                            Entities.callEntityClientMethod(playerData.players[i].id,              
                                itemID, 
                                "dropKnife",
                                ["allowed"] );                                                   
                        }
                        var tempName2 = itemName;
                        var removeNumberName2 = tempName2.slice(0,14);
                        if (removeNumberName2 === "MurderGameClue") {                            
                            playSoundEffect(playerData.players[i].id,"denied"); 
                        }

                        var knifeHitAvatarID = data;                        
                        for (var k = 0; k < playerData.players.length; k++) {            
                            if (playerData.players[k].id === knifeHitAvatarID) {
                                var playerToBeMurdered = "";
                                // Murderer kills Hero's and Bystanders
                                if (playerData.players[k].role === "Bystander" || playerData.players[k].role === "Hero") {
                                    playerToBeMurdered = playerData.players[k].id;
                                    if (playerData.players[k].status === "Alive") {
                                        playerData.players[k].name = playerData.players[k].name + "(X)";
                                        playerData.players[k].status = "Dead";
                                        print("murder me"); 
                                        playSoundEffect(playerData.players[k].id,"die");                              
                                        removePlayer(playerToBeMurdered);                           
                                        updateLeftSign();   
                                    }                                   
                                }                                                                                            
                            }
                        }                                                
                    }

                    // Bystander

                    if (playerData.players[i].role === "Bystander") {
                        var tempClueName = itemName;
                        var tempItemID = itemID;                        
                        var removeNumberClueName = tempClueName.slice(0,14);                                        
                        if (removeNumberClueName === "MurderGameClue") {
                            var itemPosition = Entities.getEntityProperties(tempItemID,"position").position;
                            var avatarProps = AvatarList.getAvatar(playerData.players[i].id);
                            var avatarPosition = avatarProps.position;
                            var distanceToClue = Vec3.distance(avatarPosition,itemPosition);
                            if (distanceToClue < CLUE_PICKUP_DISTANCE_THRESHOLD) {                            
                                if (playerData.players[i].clues.indexOf(itemName) === -1) {                           
                                    playerData.players[i].clues.push(itemName);
                                    print("player: " + playerID + " added " + itemName);
                                    print(JSON.stringify(playerData.players[i].clues));
                                    var message = "Clues: " + playerData.players[i].clues.length +"/" + CLUES_NEEDED_FOR_GUN;
                                    var duration = 2;
                                    playSoundEffect(playerData.players[i].id,"tada"); 
                                    Entities.callEntityClientMethod(playerData.players[i].id,              
                                        myID, 
                                        "notifications",
                                        [message, duration]
                                    );              
                                } else {
                                    playSoundEffect(playerData.players[i].id,"denied");
                                    Entities.callEntityClientMethod(playerData.players[i].id,              
                                        myID, 
                                        "notifications",
                                        ["Allready found this", 0.5]
                                    ); 
                                }
                                if (playerData.players[i].clues.length === CLUES_NEEDED_FOR_GUN) {
                                    playerData.players[i].role = "Hero";                                    
                                    Entities.callEntityClientMethod(playerData.players[i].id,              
                                        myID, 
                                        "giveObject",
                                        ["Gun"]
                                    );
                                    Entities.callEntityClientMethod(playerData.players[i].id,              
                                        myID, 
                                        "notifications",
                                        ["Hero", 2]
                                    ); 
                                    
                                    print (JSON.stringify(playerData.players[i]));          
                                }
                            } else {
                                playSoundEffect(playerData.players[i].id,"denied");
                                Entities.callEntityClientMethod(playerData.players[i].id,              
                                    myID, 
                                    "notifications",
                                    ["It's too far", 0.5]
                                ); 
                            }

                        }
                        var tempName3 = itemName;
                        var removeNumberName3 = tempName3.slice(0,15);
                        if (removeNumberName3 === "MurderGameKnife") {
                            playSoundEffect(playerData.players[i].id,"denied"); 
                        }                                                      
                    }

                    // Hero

                    if (playerData.players[i].role === "Hero") {
                        var tempShoot = data;                        
                        if (tempShoot === "shoot") {
                        // Handle Bullets
                            var tempBullets = playerData.players[i].bullets;
                            tempBullets = tempBullets-1;
                            playerData.players[i].bullets = tempBullets;
                            var bulletMessage = "Bullets: " + playerData.players[i].bullets +"/" + TOTAL_BULLETS;
                            var bulletMessageDuration = 0.5;
                            if (tempBullets <= 0) {
                                var messageCounter = 0;
                                var tempPlayer = playerData.players[i].id;
                                var tempTimer = Script.setInterval(function () {
                                    if ( messageCounter === 0) {   
                                        Entities.callEntityClientMethod(tempPlayer,              
                                            myID, 
                                            "notifications",
                                            ["Out of Bullets", 1]
                                        );
                                    }
                                    if (messageCounter === 2) {                                       
                                        Entities.callEntityClientMethod(tempPlayer,              
                                            myID, 
                                            "notifications",
                                            [("Bystander"), 2]
                                        );
                                    }                                   
                                    messageCounter = messageCounter +1;          
                                }, 1000);

                                Script.setTimeout(function () {
                                    Script.clearInterval(tempTimer);                                               
                                }, 5000 ); 
                                
                                playerData.players[i].bullets = 10;
                                playerData.players[i].clues = [];
                                playerData.players[i].role = "Bystander";
                                Entities.callEntityClientMethod(playerData.players[i].id,              
                                    itemID, 
                                    "removeGun",
                                    ["Allowed"]
                                );
                                Entities.callEntityClientMethod(playerData.players[i].id,              
                                    myID, 
                                    "resetGun",
                                    ["Allowed"]
                                );                                

                            } else {
                                Entities.callEntityClientMethod(playerData.players[i].id,              
                                    myID, 
                                    "notifications",
                                    [bulletMessage, bulletMessageDuration]
                                );
                            }                            
                            print("itemName " + itemName);
                            playSoundEffect(playerData.players[i].id,"shoot");
                            Entities.callEntityClientMethod(playerID,              
                                myID, 
                                "shootGun",
                                [playerID,itemID] );
                        }
                        tempShoot = "";                    
                        var gunHitAvatarID = data;
                        print("hit " + gunHitAvatarID);
                        for (var m = 0; m < playerData.players.length; m++) {            
                            if (playerData.players[m].id === gunHitAvatarID) {
                                var playerToBeShot = "";
                                
                                // if hero kills a Bystander and hero die
                                if (playerData.players[m].role === "Bystander") {
                                    playerToBeShot = playerData.players[m].id;
                                    playSoundEffect(playerData.players[m].id,"die");                                     
                                    playerData.players[i].status = "Dead";
                                    playerData.players[m].status = "Dead";
                                    playerData.players[i].name = playerData.players[i].name + "(X)";
                                    playerData.players[m].name = playerData.players[m].name + "(X)";
                                    removePlayer(playerToBeShot); 
                                    removePlayer(playerData.players[i].id);                                                                        
                                }
                                // Hero can kill a Hero and Murderer
                                if (playerData.players[m].role === "Murderer" || playerData.players[m].role === "Hero") {
                                    playerToBeShot = gunHitAvatarID;
                                    playSoundEffect(playerData.players[m].id,"die");                         
                                    print("murder me");
                                    if (gameMode !== "Kill20") {
                                        playerData.players[m].status = "Dead";
                                        playerData.players[m].name = playerData.players[m].name + "(X)";                                                            
                                        removePlayer(playerToBeShot);
                                    }
                                    if (gameMode === "Kill20") { 
                                        playerData.players[i].score = playerData.players[i].score + 1;
                                        var index = (Math.round(Math.random() * (playerStartPositions.length-1)));
                                        print("i'm sending this:" + JSON.stringify(playerStartPositions[index]));
                                        Entities.callEntityClientMethod(playerToBeShot,              
                                            myID, 
                                            "teleportMe",
                                            [JSON.stringify(playerStartPositions[index])]
                                        );                                        
                                        var splitNameKiller = playerData.players[i].name.split("-");
                                        var splitNameVictim = playerData.players[m].name.split("-");
                                        playerData.players[i].name = splitNameKiller[0] + "-" + playerData.players[i].score; 
                                        Entities.editEntity(murderRightSignID,{text: splitNameKiller[0] + "\n" + "KILLED\n" + splitNameVictim}); 
                                    }

                                }
                                print(JSON.stringify(playerData));                                                                                            
                            }
                        }
                        updateLeftSign();                                       
                    }
                                                              
                    if (itemName === "MurderConsole") {                
                        if (data === "quit" && reset) {                                
                            playerData.players[i].status = "Dead";
                            playerData.players[i].name = playerData.players[i].name + "(X)";              
                            print("lets remove player after quiting");                            
                            updateLeftSign();  
                            removePlayer(playerID);                              
                        } 
                    }                    
                                 
                    if (itemName === "MurderConsole") {
                        if (data === "roleChange") {                    
                            roleChanger(i,itemID);
                        }
                        break;
                    }                                  
                }                    
            }
        }
        if (itemName === "MurderGamePlusButton") {
            print("plus was pressed by ");
            if (playerData.players.length >= PLAYERS_MAX) {
                playSoundEffect(playerID,"denied"); 
            } else {
                playSoundEffect(playerID,"click");                               
                updatePlayerList(playerID,data);
            }
        }
        if (itemName === "MurderGameStartButton" && !startPlay) {            
            if (playerData.players.length >= PLAYERS_THRESHOLD) {
                startPlay = true;
                playSoundEffect(playerID,"tada");             
                getReady();                              
            } else {
                playSoundEffect(playerID,"denied"); 
            }                                                      
        }
        if (itemName === "MurderGameModeButton" && !startPlay) {
            gameMode = gameModes[gameModeCounter];
            gameModeCounter++;
            if (gameModeCounter >= gameModes.length) {
                gameModeCounter = 0;
            }
            Entities.editEntity(murderRightSignID,{text: "GameMode:" + "\n" + gameMode});
            playSoundEffect(playerID,"click");                                           
        }
        print(JSON.stringify(playerData));  
        playerID = Uuid.NULL;
        itemID = Uuid.NULL;
        itemName = "";
        data = ""; // string 
              
    };
    
    // get gun ID from client script
    this.receiveGun = function(id,param) {       
        var playerID = Uuid.fromString(param[0]);
        var itemID = Uuid.fromString(param[1]);
        var itemName = param[2];
        var data = param[3]; // string

        print("received from " + itemName + "with id " + itemID + "the playerID" + playerID + "data" + JSON.stringify(data));
        for (var i = 0; i < playerData.players.length; i++) {
            if (playerData.players[i].id === playerID) {
                playerData.players[i].gunID = Uuid.fromString(data);
            }   
        }                        
    };

    // get knife ID from client script
    this.receiveKnife = function(id,param) {       
        var playerIDS = Uuid.fromString(param[0]);
        var itemIDS = Uuid.fromString(param[1]);
        var itemNames = param[2];
        var datas = param[3]; // string

        print("received from " + itemNames + "with id " + itemIDS + "the playerID" + playerIDS + "data" + JSON.stringify(datas));
        for (var i = 0; i < playerData.players.length; i++) {
            if (playerData.players[i].id === playerIDS) {
                playerData.players[i].knifeID = Uuid.fromString(datas);
            }   
        }                        
    };

    this.toggleVisibility = function() {   
        var entities = Entities.findEntities({x: 0, y: 0, z: 0}, 10000);
        isVisible = !isVisible;
        for (var i in entities) {        
            var props = Entities.getEntityProperties(entities[i]);
            var slicedItemName = props.name.slice(0,14);                          
            if (slicedItemName === "MurderItemCube") {            
                Entities.editEntity(props.id, {visible: isVisible });                    
            }
            var slicedSpawnName = props.name.slice(0,15);                          
            if (slicedSpawnName === "MurderSpawnCube") {            
                Entities.editEntity(props.id, {visible: isVisible });                    
            }
        }
    };

    // handle registration
    function updatePlayerList(candidateID,candidateName) {  
        if (startPlay === false) {          
            var isRemoved = false;                      
            for (var i = 0; i < playerData.players.length; i++) {            
                if (playerData.players[i].id === candidateID) {
                    playerData.players.splice(i,1);               
                    isRemoved = true; 
                }                
            }
            if (!isRemoved) {
                print("add to  playerlist");            
                playerData.players.push({"id": candidateID ,"name": candidateName ,"role": "Bystander", "clues": [], "bullets": TOTAL_BULLETS,"gunID": Uuid.NULL , "knifeID": Uuid.NULL, "status": "Alive" , "score": 0 });           
            }
            updateLeftSign();            
        }  
    }

    function removePlayer(playerToBeRemoved) {
        Entities.callEntityClientMethod(playerToBeRemoved,              
            myID, 
            "removePlayer",
            ["allowed"]
        );                
    }

    // randomize playerlist
    function shuffle(playerObject) {
        var currentIndex = playerObject.players.length, temporaryValue, randomIndex;    
        // While there remain elements to shuffle...
        while (0 !== currentIndex) {
            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;    
            // And swap it with the current element.
            temporaryValue = playerObject.players[currentIndex];
            playerObject.players[currentIndex] = playerObject.players[randomIndex];
            playerObject.players[randomIndex] = temporaryValue;
        }
        return playerObject;
    }

    function generateQuatFromDegreesViaRadians(rotxdeg,rotydeg,rotzdeg) {
        var rotxrad = (rotxdeg/180)*Math.PI;
        var rotyrad = (rotydeg/180)*Math.PI;
        var rotzrad = (rotzdeg/180)*Math.PI;          
        var newRotation = Quat.fromPitchYawRollRadians(rotxrad,rotyrad,rotzrad); 
        return newRotation;
    }

    function updateLeftSign() {
        playersMerged = "Players (" + playerData.players.length + "/" + PLAYERS_MAX + ")" + "\n";        
        if (playerData.players.length === 0) {           
            Entities.editEntity(murderLeftSignID, { text: playersMerged});           
        } else {
            for (var i = 0; i < playerData.players.length; i++) {       
                playersMerged = playersMerged + (i+1) +".  " + playerData.players[i].name +"\n";            
            }   
            Entities.editEntity(murderLeftSignID, { text: playersMerged});            
            playersMerged = "";   
        }       
    } 
    
    function updateRightSign() {       
        var resetTextRight = "GameMode:" + "\n" + gameMode; 
        Entities.editEntity(murderRightSignID, { text: resetTextRight});             
    }   

    function findID() {       
        var entities = Entities.findEntities(SEARCH_POSITION, SEARCH_RADIUS);
        for (var i = 0; i < entities.length; i++) {
            var props = Entities.getEntityProperties(entities[i]);                     
            if (props.name === "MurderLeftSign") {
                murderLeftSignID = props.id;                                                  
            }
            if (props.name === "MurderRightSign") {
                murderRightSignID = props.id;                                                  
            }
            if (props.name === "MurderConsole" && myID === undefined) {
                myID = props.id;                                                  
            }
            
        }        
    }   

    function deleteExistingItems() {
        print("delete old entities");
        var entities = Entities.findEntities({ x: 0, y: 0, z: 0 }, SEARCH_RADIUS);
        for (var i in entities) {
            var slicedName = Entities.getEntityProperties(entities[i],["name"]).name.slice(0,15);                                      
            if (slicedName === "MurderGameKnife") {
                Entities.deleteEntity(entities[i]);                                                     
            }
            var slicedName2 = Entities.getEntityProperties(entities[i],["name"]).name.slice(0,14);                                      
            if (slicedName2 === "MurderGameClue") {
                Entities.deleteEntity(entities[i]);                                                   
            }
            var name = Entities.getEntityProperties(entities[i],["name"]).name;
            if (name === "MurderGameGun" || name === "MurderGameWeapon") {
                Entities.deleteEntity(entities[i]);
            }
            if (name === "MurderGameTeleport") {
                Entities.deleteEntity(entities[i]);
            }               
        }
        Entities.deleteEntity(bubbleID);        
    }

    function resetSigns() {
        var resetTextLeft = "Players (" + playerData.players.length + "/" + PLAYERS_MAX + ")" + "\n";  
        Entities.editEntity(murderLeftSignID, { text: resetTextLeft});
        var resetTextRight = "GameMode:" + "\n" + gameMode;  
        Entities.editEntity(murderRightSignID, { text: resetTextRight});
    }

    function getSpawnPoints() {
        print("getting spawnpoints");
        spawnPointIDs = [];
        var entities = Entities.findEntities(myPosition, SEARCH_RADIUS);
        for (var i in entities) {
            var props = Entities.getEntityProperties(entities[i]);
            //print(props.name);
            var slicedName = props.name.slice(0,15);                          
            if (slicedName === "MurderSpawnCube") {
                spawnPointPositions.push(props.position);
                spawnPointIDs.push(props.id);                                                    
            }
        }
        print("found " + spawnPointIDs.length + "spawnpoints");
    }

    function playSoundEffect(id,soundname) {
        Entities.callEntityClientMethod(id,              
            myID, 
            "playSoundEffect",
            [soundname]
        );
    }

    function getItemPoints() {
        print("getting itempoints");
        itemPointIDs = [];
        var entities = Entities.findEntities(myPosition, SEARCH_RADIUS);
        for (var i in entities) {
            var props = Entities.getEntityProperties(entities[i]);
            var slicedName = props.name.slice(0,14);                          
            if (slicedName === "MurderItemCube") {
                itemPointIDs.push(props.id);                                                 
            }
        }
        print("found " + itemPointIDs.length + "itempoints");
    }

    function createRoles() {
        if (gameMode === "MurderGame") {
            shuffle(playerData);           
            playerData.players[0].role = "Murderer";            
            playerData.players[1].role = "Hero";            
        }
        if (gameMode === "LastMan" || gameMode === "Kill20" || gameMode === "BattleRoyal") {
            for (var i = 0; i < playerData.players.length; i++) { 
                playerData.players[i].role = "Hero";
                TOTAL_BULLETS = 100;
                playerData.players[i].bullets = TOTAL_BULLETS;
            }               
        }
    }

    function createSpawnLocations() {
        print("setting spawn point positions");
        for (var p = 0; p < playerData.players.length; p++) {
            var q = Math.floor(Math.random() * spawnPointPositions.length);
            playerStartPositions[p] = spawnPointPositions [q];
            //spawnPointPositions.splice(q, 1);
        }
        print("spawn point positions" + JSON.stringify(playerStartPositions));        
    }

    function spawnClues() {
        var localRot = generateQuatFromDegreesViaRadians (90 , 0 , 0);
        var localRot3 = generateQuatFromDegreesViaRadians (0 , 180 , 0);        
        if (TOTAL_CLUES + TOTAL_KNIVES < itemPointIDs.length) {      
            for (var k = 0; k < TOTAL_CLUES; k++) {
                var l = Math.floor(Math.random() * itemPointIDs.length);                         
                var currentItemPosition = Entities.getEntityProperties(itemPointIDs[l],["position"]).position;
                var clueID = Entities.addEntity( {
                    type: "Model",
                    unlit: true,
                    modelURL: LOCATION_ROOT_URL + "Clue.fbx",                  
                    name: "MurderGameClue" + k,                    
                    script: LOCATION_ROOT_URL + "MurderGameClue.js?"+ Date.now(),               
                    dimensions: { x: 0.3, y: 0.01, z: 0.5 },                    
                    position: Vec3.sum(currentItemPosition, { x: 0, y: -0.2, z: 0 }),
                    rotation: localRot,
                    angularDamping: 0,
                    angularVelocity: { x: 0, y: 1, z: 0},                           
                    lifetime: -1,          
                    userData: "{ \"grabbableKey\": { \"grabbable\": false, \"triggerable\": true}}"
                });
                Entities.addEntity({
                    name: "MurderGameLightClue",
                    type: "Light",
                    parentID: clueID,
                    localPosition: { x: 0, y: 0, z: -1.2 },
                    localRotation: localRot3,                    
                    dimensions: { x: 5, y: 5, z: 5 },
                    color: { r: 0, g: 0, b: 255 },
                    intensity: 20,
                    falloffRadius: 100,
                    isSpotlight: true,
                    exponent: 50,
                    cutoff: 30,
                    lifetime: -1
                });       
                clueIDs.push(clueID);
                itemPointIDs.splice(l,1);
            }
        } else {
            print("Not enough item Spawn Points!");
        }        
    }

    function spawnKnives() {         
        var localRot2 = generateQuatFromDegreesViaRadians (-90 , 0 , 0);
        for (var m = 0; m < TOTAL_KNIVES; m++) {
            var n = Math.floor(Math.random() * itemPointIDs.length);                         
            var currentItemPosition = Entities.getEntityProperties(itemPointIDs[n],["position"]).position;
            var knifeID = Entities.addEntity( {
                type: "Model",
                unlit: true,                    
                modelURL: LOCATION_ROOT_URL + "Knive3.fbx",                                      
                name: "MurderGameKnife" + m,                
                script: LOCATION_ROOT_URL + "MurderGameKnife.js?"+ Date.now(),                  
                dimensions: { x: 0.65, y: 0.15, z: 0.05 },    
                position: currentItemPosition,                            
                lifetime: -1,                   
                angularVelocity: { x: 0, y: 1, z: 0},
                angularDamping: 0,          
                userData: "{ \"grabbableKey\": { \"grabbable\": false, \"triggerable\": true}}"
            });
            Entities.addEntity({
                name: "MurderGameLightKnife",
                type: "Light",
                parentID: knifeID,
                localPosition: { x: 0, y: 1.2, z: 0 },
                localRotation: localRot2,                    
                dimensions: { x: 5, y: 5, z: 5 },
                color: { r: 255, g: 0, b: 0 },
                intensity: 20,
                falloffRadius: 100,
                isSpotlight: true,
                exponent: 50,
                cutoff: 30,
                lifetime: -1
            });              
            knifeIDs.push(knifeID);
            itemPointIDs.splice(n,1);
        }                
    }

    function setShrinkingSphere() {
        bubbleID = Entities.addEntity({
            type: "Model",        
            shape: "Sphere", 
            modelURL: LOCATION_ROOT_URL + "bubble.fbx?" + Date.now(),                     
            name: "MurdergameBubble",                    
            description: "",               
            lifetime: -1,
            //angularVelocity: { x: 0.5, y: 0.2, z: 0.3 }, 
            angularDamping: 0,
            color: { r: 255, g: 255, b: 255 },            
            //alpha: 1,
            dimensions: BATTLE_ROYAL_SPHERE_DIMENSION,                
            dynamic: false,
            collisionless: true,                     
            damping: 0.2,
            position: myPosition,               
            userData: "{ \"grabbableKey\": { \"grabbable\": false, \"triggerable\": false } }"    
        },"domain");

        var materialID = Entities.addEntity({
            type: "Material",
            name: "MurdergameBubbleMaterial",            
            materialURL: "materialData",
            priority: 1,
            visible: true,
            collisionless: true,
            parentID: bubbleID,
            lifetime: -1,
            materialData: JSON.stringify({
                materialVersion: 1,
                materials: {
                    albedo: { r: 1, g: 1, b: 1 },
                    albedoMap: LOCATION_ROOT_URL + "soapbubble-512.jpg",
                    unlit: false,                                       
                    roughness: 1,                    
                    emissive: { r: 0.2, g: 0.2, b: 0.2 },                    
                    opacity: 0.5,
                    opacityMap: LOCATION_ROOT_URL + "soapbubble-512.jpg",                 
                    materialMappingScale: { x: 2, y: 2 }
                }
            })
        });               

        var timer = Script.setInterval(function () {
            bubbleSize = bubbleSize - 1;
            Entities.editEntity(bubbleID, {            
                dimensions: { x: bubbleSize, y: bubbleSize, z: bubbleSize }
            });                         
        }, 1000);
    }

    function spawnTeleports() {
        var localRot5 = generateQuatFromDegreesViaRadians (0 , 90 , 0);
        var telePortID1A = Entities.addEntity( {
            type: "Shape",
            shape: "Cube",
            name: "MurderGameTeleport",
            position: { x: -7.5, y: -15, z: 11.6 },
            rotation: localRot5,                    
            dimensions: { x: 1.5, y: 2.4, z: 0.4 },
            script: LOCATION_ROOT_URL + "MurderGameTeleport.js?"+ Date.now(),       
            visible: true, 
            collisionless: true,        
            color: { r: 0, g: 0, b: 255 },                     
            lifetime: -1,            
            userData: JSON.stringify({
                grabbableKey: { grabbable: false, triggerable: false }
            } )                          
        });        
        Entities.addEntity({
            type: "Material",
            name: "MurderGameTelportMaterial",
            position: { x: 0, y: 0, z: 0 },
            parentID: telePortID1A,
            materialURL: "materialData",
            priority: 1,
            visible: true,
            collisionless: true,
            materialData: JSON.stringify({
                materialVersion: 1,
                materials: {
                    albedo: { r: 0, g: 0, b: 1 },                   
                    roughness: 0.5,                    
                    emissive: { r: 0, g: 0, b: 1 },                    
                    opacity: 0.01                    
                }
            })
        });
        localRot5 = generateQuatFromDegreesViaRadians (0 , 180 , 0);
        var telePortID1B = Entities.addEntity( {
            type: "Shape",
            shape: "Cube",
            name: "MurderGameTeleport",
            position: { x: -12.2, y: 12, z: -13.3 },
            rotation: localRot5,                    
            dimensions: { x: 1.5, y: 2.4, z: 0.4 },            
            script: LOCATION_ROOT_URL + "MurderGameTeleport.js?"+ Date.now(),       
            visible: true, 
            collisionless: true,        
            color: { r: 0, g: 0, b: 255 },                     
            lifetime: -1,            
            userData: JSON.stringify({
                grabbableKey: { grabbable: false, triggerable: false }
            } )                          
        });
        Entities.addEntity({
            type: "Material",
            name: "MurderGameTelportMaterial",
            position: { x: 0, y: 0, z: 0 },
            parentID: telePortID1B,
            materialURL: "materialData",
            priority: 1,
            visible: true,
            collisionless: true,
            materialData: JSON.stringify({
                materialVersion: 1,
                materials: {
                    albedo: { r: 0, g: 0, b: 1 },                   
                    roughness: 0.5,                    
                    emissive: { r: 0, g: 0, b: 1 },                    
                    opacity: 0.01                    
                }
            })
        });
        localRot5 = generateQuatFromDegreesViaRadians (0 , 0 , 0);
        var telePortID2A = Entities.addEntity( {
            type: "Shape",
            shape: "Cube",
            name: "MurderGameTeleport",
            position: { x: 12.2, y: 11.8, z: 13.7 },
            rotation: localRot5,                    
            dimensions: { x: 1.5, y: 2.4, z: 0.4 },            
            script: LOCATION_ROOT_URL + "MurderGameTeleport.js?"+ Date.now(),       
            visible: true, 
            collisionless: true,        
            color: { r: 255, g: 255, b: 0 },                     
            lifetime: -1,            
            userData: JSON.stringify({
                grabbableKey: { grabbable: false, triggerable: false }
            } )                          
        });
        Entities.addEntity({
            type: "Material",
            name: "MurderGameTelportMaterial",
            position: { x: 0, y: 0, z: 0 },
            parentID: telePortID2A,
            materialURL: "materialData",
            priority: 1,
            visible: true,
            collisionless: true,
            materialData: JSON.stringify({
                materialVersion: 1,
                materials: {
                    albedo: { r: 1, g: 1, b: 0 },                   
                    roughness: 0.5,                    
                    emissive: { r: 1, g: 1, b: 0 },                    
                    opacity: 0.01                    
                }
            })
        });
        localRot5 = generateQuatFromDegreesViaRadians (0 , 90 , 0);
        var telePortID2B = Entities.addEntity( {
            type: "Shape",
            shape: "Cube",
            name: "MurderGameTeleport",
            position: { x: 13.6, y: -2.1, z: -11.8 },
            rotation: localRot5,                    
            dimensions: { x: 1.5, y: 2.4, z: 0.4 },
            script: LOCATION_ROOT_URL + "MurderGameTeleport.js?"+ Date.now(),       
            visible: true, 
            collisionless: true,        
            color: { r: 255, g: 255, b: 0 },                     
            lifetime: -1,            
            userData: JSON.stringify({
                grabbableKey: { grabbable: false, triggerable: false }
            } )                          
        });
        Entities.addEntity({
            type: "Material",
            name: "MurderGameTelportMaterial",
            position: { x: 0, y: 0, z: 0 },
            parentID: telePortID2B,
            materialURL: "materialData",
            priority: 1,
            visible: true,
            collisionless: true,
            materialData: JSON.stringify({
                materialVersion: 1,
                materials: {
                    albedo: { r: 1, g: 1, b: 0 },                   
                    roughness: 0.5,                    
                    emissive: { r: 1, g: 1, b: 0 },                    
                    opacity: 0.01                    
                }
            })
        });
    }

    function telePortToArena() {
        for (var o = 0; o < playerData.players.length; o++) {           
            Entities.callEntityClientMethod(playerData.players[o].id,              
                myID, 
                "teleportMe",
                [JSON.stringify(playerStartPositions[o])]
            );                
            playSoundEffect(playerData.players[o].id,"teleport");                
        }               
    }

    function getReady() {      
        var counter = 0; 
        timer = Script.setInterval(function () {
            var message = GET_READY_MESSAGE[counter];
            var duration = GET_READY_DURATION / 1000;
            for (var o = 0; o < playerData.players.length; o++) {                            
                Entities.callEntityClientMethod(playerData.players[o].id,              
                    myID, 
                    "notifications",
                    [message, duration]
                );                
                if (counter >= 1) {
                    playSoundEffect(playerData.players[o].id,"click");
                }     
            }
            counter++;
                                    
        }, GET_READY_DURATION);
        
        Script.setTimeout(function () {
            Script.clearInterval(timer);
            initialize();            
        }, GET_READY_DURATION * GET_READY_MESSAGE.length + GET_READY_DURATION );             
    }

    function informPlayersOfRoles() {
        for (var o = 0; o < playerData.players.length; o++) {
            var message = playerData.players[o].role;
            var duration = JSON.stringify(ROLE_MESSAGE_DURATION);                         
            Entities.callEntityClientMethod(playerData.players[o].id,              
                myID, 
                "notifications",
                [message, duration]
            );              
                
        } 
    }       

    function giveGunToHero() {
        for (var o = 0; o < playerData.players.length; o++) {
            if (playerData.players[o].role === "Hero") {                
                playSoundEffect(playerData.players[o].id,"swoosh");                 
                Entities.callEntityClientMethod(playerData.players[o].id,              
                    myID, 
                    "giveObject",
                    ["Gun"]
                );            
                              
            }
        }
    }
    function startMusic() {
        for (var o = 0; o < playerData.players.length; o++) {                     
            Entities.callEntityClientMethod(playerData.players[o].id,              
                myID, 
                "startMusic",
                ["Allowed"]
            );      
        }
    }
    
    function roleChanger(idCounter,item) {
        if (reset) {
            roleNumber = roleNumber +1;
            if (roleNumber > 2) {
                roleNumber = 0;
            }
            reset = false;             
            // print(JSON.stringify(playerData));            
            playerData.players[idCounter].bullets = 10;
            playerData.players[idCounter].clues = [];

            if (playerData.players[idCounter].gunID !== Uuid.NULL) {
                Entities.callEntityClientMethod(playerData.players[idCounter].id,              
                    playerData.players[idCounter].gunID, 
                    "removeGun",
                    ["Allowed"]
                );
                Entities.callEntityClientMethod(playerData.players[idCounter].id,              
                    item, 
                    "resetGun",
                    ["Allowed"]
                );
                playerData.players[idCounter].gunID = Uuid.NULL;
            }

            print("roleNumber" + roleNumber);           
            if (roleNumber === 0) {
                
                Entities.callEntityClientMethod(playerData.players[idCounter].id,              
                    item, 
                    "notifications",
                    [("Murderer"), 2]
                );                             
                playerData.players[idCounter].role = "Murderer";
                   
            }
            if (roleNumber === 1) { 
                                                            
                Entities.callEntityClientMethod(playerData.players[idCounter].id,              
                    item, 
                    "notifications",
                    [("Bystander"), 2]
                );
                if (playerData.players[idCounter].knifeID !== Uuid.NULL) {
                    Entities.deleteEntity(playerData.players[idCounter].knifeID);
                    isEquipped = false;                 
                    Entities.callEntityClientMethod(playerData.players[idCounter].id,              
                        playerData.players[idCounter].knifeID, 
                        "dropKnife",
                        ["allowed"] );  
                    playerData.players[idCounter].knifeID = Uuid.NULL;
                }
                playerData.players[idCounter].role = "Bystander";                          
            }
            if (roleNumber === 2) { 
                
                Entities.callEntityClientMethod(playerData.players[idCounter].id,              
                    item, 
                    "giveObject",
                    ["Gun"]
                );                                               
                Entities.callEntityClientMethod(playerData.players[idCounter].id,              
                    item, 
                    "notifications",
                    [("Hero"), 2]
                );
                print("giving gun to player" + playerData.players[idCounter].role);              
                playerData.players[idCounter].role = "Hero";             
            }                               
        }
    }

    function avatarChecker() {        
        var check = AvatarList.getAvatarIdentifiers();        
        if (playerData.players.length > 0) {
            for (var i = 0; i < playerData.players.length; i++) {
                if (playerData.players[i].id !== Uuid.NULL) {
                    // check if players are in the domain and closeby otherwise remove from list 
                    var avatarInfo = AvatarList.getAvatar(playerData.players[i].id);
                    var avatarDistance = Vec3.distance(avatarInfo.position,myPosition);                                    
                    if (avatarDistance > AVATAR_DISTANCE_THRESHOLD || check.indexOf(playerData.players[i].id) === -1) {
                        print("player " + playerData.players[i].name + " was too far or left domain and is removed from the game");
                        if (startPlay) {
                            removePlayer(playerData.players[i].id);                                                 
                        }                        
                        playerData.players.splice(i,1);
                        updateLeftSign();
                        break;                    
                    }                    
                }                
            }            
        }
    }

    function statusChecker() {
        var totalPlayers = playerData.players.length;
        var deathToll = 0;
        var lastManID = "";
        var lastManName = "";
        var lastManRole = "";        
        
        if (playerData.players.length > 0) {
            for (var i = 0; i < playerData.players.length; i++) {
                if (playerData.players[i].id !== Uuid.NULL) {
                    
                    // check who is alive, last one wins
                    if (gameMode !== "Kill20") {
                        if (playerData.players[i].status === "Alive") {
                            lastManID = playerData.players[i].id;
                            lastManName = playerData.players[i].name;
                            lastManRole = playerData.players[i].role;
                        }
                    }

                    // check if there is still a murderer
                    if (gameMode === "MurderGame") {
                        if (playerData.players[i].role === "Murderer" && playerData.players[i].status === "Dead") {
                            murdererIsKilled(playerData.players[i].name);
                            break;
                        }
                    }
                    // check if battleRoyalPlayer is outside bubble
                    if (gameMode === "BattleRoyal") {
                        var avatarInfo = AvatarList.getAvatar (playerData.players[i].id);
                        var avatarPosition = avatarInfo.position;
                        var distanceToConsole = Vec3.distance(avatarPosition,myPosition);
                        print(playerData.players[i].name + "bubbeleSize:" + bubbleSize);
                        print(playerData.players[i].name + "distanceToConsoleSize:" + distanceToConsole);
                        if (distanceToConsole > bubbleSize/2) {                            
                            playSoundEffect(playerData.players[i].id,"die");                                     
                            playerData.players[i].status = "Dead";                                   
                            playerData.players[i].name = playerData.players[i].name + "(X)";                                    
                            removePlayer(playerData.players[i].id);
                            updateLeftSign();                            
                        }                        
                    }
                    
                    // count Deads
                    if (gameMode !== "Kill20") {
                        if (playerData.players[i].status === "Dead") {
                            deathToll++;
                        }
                    }

                    // finish game if one left
                    if (gameMode !== "Kill20") {
                        if ((totalPlayers - deathToll) <= 1 && startPlay) {
                            endGame(lastManID,lastManName,lastManRole);
                            break;
                        }
                    }

                    if (gameMode === "Kill20") {
                        if (playerData.players[i].score >= MAX_SCORE) {
                            endGame(playerData.players[i].id,playerData.players[i].name.split("-")[0],playerData.players[i].role);
                        }
                    }

                    // check if there any players in the game if not reset
                    if (playerData.players.length === 0 && startPlay) {
                        isGameFinished = false;
                        startPlay = false;
                        deleteExistingItems();                                                 
                        Entities.reloadServerScripts(myID);                    
                    }
                }
                
            }            
        }
    }
    
    function murdererIsKilled(murderName) {
        print("loser = :"+murderName); 
        print(murderName);        
        Entities.editEntity(murderRightSignID,
            {text: "THE WORLD IS SAVED!:\n" + murderName + "WAS KILLED\n" + "AND LOSES THE GAME\n" + "OTHER PLAYERS WIN\n" });
        for (var j = 0; j < playerData.players.length; j++) {            
            if (playerData.players[j].status === "Alive") {
                removePlayer(playerData.players[j].id);       
            }           
        }
        deleteExistingItems();
        isGameFinished = false;
        startPlay = false;
        playerData.players =[];                
        Entities.reloadServerScripts(myID);
    }

    function endGame(winnerID,winnerName,role) {
        print("winner:"+winnerName);
        if (gameMode === "MurderGame") {
            if (role === "Hero") {                        
                Entities.editEntity(murderRightSignID,{text: "THE SOLE SURVIVOR\n" + "AND WINNER IS:\n" + winnerName});        
            }
            if (role === "Murderer") {          
                Entities.editEntity(murderRightSignID,{text: "EVIL REIGNS!\n" + "MURDERER " + winnerName + "\n" + "WINS"});        
            }
            removePlayer(winnerID);       
        }

        if (gameMode === "LastMan" || gameMode === "BattleRoyal") {                               
            Entities.editEntity(murderRightSignID,{text: "THE SOLE SURVIVOR\n" + "AND WINNER IS:\n" + winnerName});
            removePlayer(winnerID);         
        }

        if (gameMode === "Kill20") {                               
            Entities.editEntity(murderRightSignID,{text: "THE KILL20 \n" + "WINNER IS:\n" + winnerName});  
            print(JSON.stringify(playerData));
            for (var k = 0; k < playerData.players.length; k++) {
                removePlayer(playerData.players[k].id); 
            }                
        } 
        
        deleteExistingItems();
        isGameFinished = false;
        startPlay = false;
        playerData.players =[];              
        Entities.reloadServerScripts(myID);
    }

    function initialize() {
        resetSigns();
        deleteExistingItems();                
        getSpawnPoints();       
        getItemPoints();       
        createRoles();        
        createSpawnLocations();       
        //spawnTeleports();
        if (gameMode === "MurderGame") {
            spawnClues();  
            print("ini 8");
            spawnKnives();
            print("ini 9");
        }
                
        telePortToArena();        
        print("ini 10");        
        Script.setTimeout(function () {           
            informPlayersOfRoles();
            print("ini 11");          
        }, 1000);
        giveGunToHero();
        if (gameMode === "BattleRoyal") {
            setShrinkingSphere();           
        }        
        startMusic();
    }

    var heartBeat = Script.setInterval(function() {  
        reset = true;
        avatarChecker();
        if (startPlay) {        
            statusChecker();           
        }                
    }, RESET_TIME_MS);       

    Script.setTimeout(function () {         
        print("script ready");          
    }, 2000);    

    findID(); 
});