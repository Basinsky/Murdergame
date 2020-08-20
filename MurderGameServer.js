(function () {   
    var PLAYERS_THRESHOLD = 2;
    var PLAYERS_MAX = 10;    
    var AVATAR_DISTANCE_THRESHOLD = 50;
    var CLUE_PICKUP_DISTANCE_THRESHOLD = 3;
    var SEARCH_RADIUS = 1000;
    var SEARCH_POSITION = { x: 0, y: 0, z: 0};
    var TOTAL_CLUES = 10;
    var TOTAL_KNIVES = 10;
    var TOTAL_BULLETS =10;
    var RESET_TIME_MS = 1000;
    var ROLE_MESSAGE_DURATION = 1; // seconds
    var GET_READY_MESSAGE = ["Get Ready","3","2","1","GO !!"];
    var GET_READY_DURATION = 1000; // miliseconds  
    var startPlay = false;
    var isGameFinished = false;    
    var LOCATION_ROOT_URL ="http://192.168.2.200/Murdergame/";    
    var timer;
    var myID;      
    var myPosition;   
    var murderLeftSignID;
    var murderRightSignID;
    var foundMurderBuildingID;       
    var playerData = {"players": [
        {"id": Uuid.NULL ,"name": "DUMMY1" ,"role": "Bystander", "clues": "0", "bullets": TOTAL_BULLETS, "gunID": Uuid.NULL, "knifeID": Uuid.NULL, "status": "Alive" },
        {"id": Uuid.NULL ,"name": "BAS2" ,"role": "Bystander", "clues": "0", "bullets": TOTAL_BULLETS, "gunID": Uuid.NULL, "knifeID": Uuid.NULL, "status": "Alive" }      
    ]}; 
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
    var gameModes = ["MurderGame","LastMan"];
    var gameModeCounter = 1;
    var gameMode = "MurderGame";   
    

    this.remotelyCallable = [
        "receiveDataFromItem",
        "receiveGun",
        "receiveKnife"             
    ]; 

    this.preload = function (entityID) {       
        myID = entityID;
        myPosition = Entities.getEntityProperties(myID,"position").position;              
        Entities.editEntity(myID,{ script: LOCATION_ROOT_URL + "MurderGameClient.js?" + Date.now()});        
        deleteExistingItems();                      
    };   
    
    this.unload = function (entityID) {        
            
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
                                        Entities.callEntityClientMethod(playerToBeMurdered,              
                                            myID, 
                                            "removePlayer",
                                            ["allowed"] );                                
                                        updateSign();   
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
                                    var message = "Clues: " + playerData.players[i].clues.length +"/" + TOTAL_CLUES;
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
                                if (playerData.players[i].clues.length === TOTAL_CLUES) {                                    
                                    Entities.callEntityClientMethod(playerData.players[i].id,              
                                        myID, 
                                        "giveObject",
                                        ["Gun"]
                                    );
                                    playerData.players[i].role = "Hero";
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
                                    Entities.callEntityClientMethod(playerToBeShot,              
                                        myID, 
                                        "removePlayer",
                                        ["allowed"] );
                                    Entities.callEntityClientMethod(playerData.players[i].id,              
                                        myID, 
                                        "removePlayer",
                                        ["allowed"] );                                                                           
                                }
                                // Hero can kill a Hero and Murderer
                                if (playerData.players[m].role === "Murderer" || playerData.players[m].role === "Hero") {
                                    playerToBeShot = gunHitAvatarID;
                                    playSoundEffect(playerData.players[m].id,"die");                         
                                    print("murder me");
                                    playerData.players[m].status = "Dead";
                                    playerData.players[m].name = playerData.players[m].name + "(X)";                                                            
                                    Entities.callEntityClientMethod(playerToBeShot,              
                                        myID, 
                                        "removePlayer",
                                        ["allowed"] );
                                }
                                print(JSON.stringify(playerData));                                                                                            
                            }
                        }
                        updateSign();                                       
                    }
                                                              
                    if (itemName === "MurderConsole") {                
                        if (data === "quit" && reset) {                                
                            playerData.players[i].status = "Dead";
                            playerData.players[i].name = playerData.players[i].name + "(X)";              
                            print("lets remove player after quiting");                            
                            updateSign();  
                            Entities.callEntityClientMethod(playerID,             
                                myID, 
                                "removePlayer",
                                ["allowed"] );                               
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
        var playerID5 = Uuid.fromString(param[0]);
        var itemID5 = Uuid.fromString(param[1]);
        var itemName5 = param[2];
        var data5 = param[3]; // string

        print("received from " + itemName5 + "with id " + itemID5 + "the playerID" + playerID5 + "data" + JSON.stringify(data5));
        for (var i = 0; i < playerData.players.length; i++) {
            if (playerData.players[i].id === playerID5) {
                playerData.players[i].knifeID = Uuid.fromString(data5);
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
                playerData.players.push({"id": candidateID ,"name": candidateName ,"role": "Bystander", "clues": [], "bullets": TOTAL_BULLETS,"gunID": Uuid.NULL , "knifeID": Uuid.NULL, "status": "Alive" });           
            }
            updateSign();            
        }  
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

    function updateSign() {
        playersMerged = "Players (" + playerData.players.length + "/" + PLAYERS_MAX + ")" + "\n";        
        if (playerData.players.length === 0) {           
            Entities.editEntity(murderLeftSignID, { text: playersMerged});           
        } else {
            for (var i = 0; i < playerData.players.length; i++) {       
                playersMerged = playersMerged + (i+1) +".  " + playerData.players[i].name +"\n";            
            }   
            Entities.editEntity(murderLeftSignID, { text: playersMerged});
            var resetTextRight = "GameMode:" + "\n" + gameMode; 
            Entities.editEntity(murderRightSignID, { text: resetTextRight});
            playersMerged = "";   
        }       
    }   

    function findID() {       
        var entities = Entities.findEntities(SEARCH_POSITION, SEARCH_RADIUS);
        for (var i = 0; i < entities.length; i++) {
            var props = Entities.getEntityProperties(entities[i]);                            
            if (props.name === "MurderBuilding") {
                foundMurderBuildingID = props.id;                                               
            }            
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
    }

    function resetSigns() {
        var resetTextLeft = "Players (" + playerData.players.length + "/" + PLAYERS_MAX + ")" + "\n";  
        Entities.editEntity(murderLeftSignID, { text: resetTextLeft});
        var resetTextRight = "GameMode:" + "\n" + gameMode;  
        Entities.editEntity(murderRightSignID, { text: resetTextRight});
    }

    function getSpawnPoints() {
        spawnPointIDs = [];
        var entities = Entities.findEntities(myPosition, SEARCH_RADIUS);
        for (var i in entities) {
            var props = Entities.getEntityProperties(entities[i]);
            var slicedName = props.name.slice(0,15);                          
            if (slicedName === "MurderSpawnCube") {
                spawnPointPositions.push(props.position);
                spawnPointIDs.push(props.id);                                                    
            }
        }
    }

    function playSoundEffect(id,soundname) {
        Entities.callEntityClientMethod(id,              
            myID, 
            "playSoundEffect",
            [soundname]
        );
    }

    function getItemPoints() {
        itemPointIDs = [];
        var entities = Entities.findEntities(myPosition, SEARCH_RADIUS);
        for (var i in entities) {
            var props = Entities.getEntityProperties(entities[i]);
            var slicedName = props.name.slice(0,14);                          
            if (slicedName === "MurderItemCube") {
                itemPointIDs.push(props.id);                                                 
            }
        }
    }

    function createRoles() {
        if (gameMode === "MurderGame") {
            shuffle(playerData);           
            playerData.players[0].role = "Murderer";            
            playerData.players[1].role = "Hero";            
        }
        if (gameMode === "LastMan") {
            for (var i = 0; i < playerData.players.length; i++) { 
                playerData.players[i].role = "Hero";
                TOTAL_BULLETS = 100;
                playerData.players[i].bullets = TOTAL_BULLETS;
                
            }               
        }
    }

    function createSpawnLocations() {
        for (var p = 0; p < playerData.players.length; p++) {
            var q = Math.floor(Math.random() * spawnPointPositions.length);
            playerStartPositions[p] = spawnPointPositions [q];     
        }        
    }

    function spawnClues() {
        var localRot = generateQuatFromDegreesViaRadians (90 , 0 , 0);
        var localRot3 = generateQuatFromDegreesViaRadians (0 , 180 , 0);
        if (foundMurderBuildingID) { 
            if (TOTAL_CLUES + TOTAL_KNIVES < itemPointIDs.length) {      
                for (var k = 0; k < TOTAL_CLUES; k++) {
                    var l = Math.floor(Math.random() * itemPointIDs.length);                         
                    var currentItemPosition = Entities.getEntityProperties(itemPointIDs[l],["localPosition"]).localPosition;
                    var clueID = Entities.addEntity( {
                        type: "Model",
                        unlit: true,
                        modelURL: LOCATION_ROOT_URL + "Clue.fbx",                  
                        name: "MurderGameClue" + k,                    
                        parentID: foundMurderBuildingID,
                        script: LOCATION_ROOT_URL + "MurderGameClue.js?"+ Date.now(),               
                        localDimensions: { x: 0.3, y: 0.01, z: 0.5 },                    
                        localPosition: Vec3.sum(currentItemPosition, { x: 0, y: -0.2, z: 0 }),
                        localRotation: localRot,
                        angularDamping: 0,
                        localAngularVelocity: { x: 0, y: 1, z: 0},                           
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
    }

    function spawnKnives() {
        if (foundMurderBuildingID) {  
            var localRot2 = generateQuatFromDegreesViaRadians (-90 , 0 , 0);
            for (var m = 0; m < TOTAL_KNIVES; m++) {
                var n = Math.floor(Math.random() * itemPointIDs.length);                         
                var currentItemPosition = Entities.getEntityProperties(itemPointIDs[n],["localPosition"]).localPosition;
                var knifeID = Entities.addEntity( {
                    type: "Model",
                    unlit: true,                    
                    modelURL: LOCATION_ROOT_URL + "Knive3.fbx",                                      
                    name: "MurderGameKnife" + m,
                    parentID: foundMurderBuildingID,
                    script: LOCATION_ROOT_URL + "MurderGameKnife.js?"+ Date.now(),                  
                    localDimensions: { x: 0.65, y: 0.15, z: 0.05 },    
                    localPosition: currentItemPosition,                            
                    lifetime: -1,                   
                    localAngularVelocity: { x: 0, y: 1, z: 0},
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
    }

    function spawnTeleports() {
        var localRot5 = generateQuatFromDegreesViaRadians (0 , 90 , 0);
        var telePortID1A = Entities.addEntity( {
            type: "Shape",
            shape: "Cube",
            name: "MurderGameTeleport",
            localPosition: { x: -7.5, y: -15, z: 11.6 },
            localRotation: localRot5,                    
            dimensions: { x: 1.5, y: 2.4, z: 0.4 },            
            parentID: foundMurderBuildingID,
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
            localPosition: { x: -12.2, y: 12, z: -13.3 },
            localRotation: localRot5,                    
            dimensions: { x: 1.5, y: 2.4, z: 0.4 },            
            parentID: foundMurderBuildingID,
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
            localPosition: { x: 12.2, y: 11.8, z: 13.7 },
            localRotation: localRot5,                    
            dimensions: { x: 1.5, y: 2.4, z: 0.4 },            
            parentID: foundMurderBuildingID,
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
            localPosition: { x: 13.6, y: -2.1, z: -11.8 },
            localRotation: localRot5,                    
            dimensions: { x: 1.5, y: 2.4, z: 0.4 },            
            parentID: foundMurderBuildingID,
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
            if (foundMurderBuildingID) {
                Entities.callEntityClientMethod(playerData.players[o].id,              
                    myID, 
                    "teleportMe",
                    [JSON.stringify(playerStartPositions[o])]
                );                
                playSoundEffect(playerData.players[o].id,"teleport");                
            }    
        }               
    }

    function getReady() {      
        var counter = 0; 
        timer = Script.setInterval(function () {
            var message = GET_READY_MESSAGE[counter];
            var duration = GET_READY_DURATION / 1000;
            for (var o = 0; o < playerData.players.length; o++) {                                                
                if (foundMurderBuildingID) {               
                    Entities.callEntityClientMethod(playerData.players[o].id,              
                        myID, 
                        "notifications",
                        [message, duration]
                    );              
                }
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
            if (foundMurderBuildingID) {               
                Entities.callEntityClientMethod(playerData.players[o].id,              
                    myID, 
                    "notifications",
                    [message, duration]
                );              
            }    
        } 
    }       

    function giveGunToHero() {
        for (var o = 0; o < playerData.players.length; o++) {
            if (playerData.players[o].role === "Hero") {                                        
                if (foundMurderBuildingID) {
                    playSoundEffect(playerData.players[o].id,"swoosh");                 
                    Entities.callEntityClientMethod(playerData.players[o].id,              
                        myID, 
                        "giveObject",
                        ["Gun"]
                    );              
                }                
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
                            Entities.callEntityClientMethod(playerData.players[i].id,              
                                myID, 
                                "removePlayer",
                                []
                            );                            
                        }                        
                        playerData.players.splice(i,1);
                        updateSign();
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
                    if (playerData.players[i].status === "Alive") {
                        lastManID = playerData.players[i].id;
                        lastManName = playerData.players[i].name;
                        lastManRole = playerData.players[i].role;
                    }

                    // check if there is still a murderer
                    if (playerData.players[i].role === "Murderer" && playerData.players[i].status === "Dead") {
                        murdererIsKilled(playerData.players[i].name);
                        break;
                    }
                    
                    // count Deads
                    if (playerData.players[i].status === "Dead") {
                        deathToll++;
                    }

                    // finish game if one left
                    if ((totalPlayers - deathToll) <= 1 && startPlay) {
                        endGame(lastManID,lastManName,lastManRole);
                        break;
                    }

                    // check if there any players in the game if not reset
                    if (playerData.players.length === 0 && startPlay) {
                        isGameFinished = false;
                        startPlay = false;                         
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
                Entities.callEntityClientMethod(playerData.players[j].id,              
                    myID, 
                    "removePlayer",
                    []
                );
            }           
        }

        isGameFinished = false;
        startPlay = false;
        playerData.players =[];                
        Entities.reloadServerScripts(myID);
    }

    function endGame(winnerID,winnerName,role) {
        print("winner:"+winnerName);
        if (role === "Hero") {          
            Entities.editEntity(murderRightSignID,{text: "THE SOLE SURVIVOR\n" + "AND WINNER IS:\n" + winnerName});        
        }
        if (role === "Murderer") {          
            Entities.editEntity(murderRightSignID,{text: "EVIL REIGNS!\n" + "MURDERER " + winnerName + "\n" + "WINS"});        
        }

        Entities.callEntityClientMethod(winnerID,              
            myID, 
            "removePlayer",
            []
        );       
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
        spawnTeleports();
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