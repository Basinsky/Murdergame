(function () {
    var UPDATE_MS = 1000/30;
    var reset = false;
    var RESET_TIME = 1000;     
    var LOCATION_ROOT_URL ="https://bas-skyspace.ams3.digitaloceanspaces.com/MurderGame/";     
    var myID;  
    var myName;      
    var shootSound;
    var music;    
    var injector;    
    var teleportSound;
    var tadaSound;
    var clickSound;
    var dieSound;
    var deniedSound;
    var swooshSound;
    var myPosition;
    var PICK_FILTERS = Picks.PICK_ENTITIES | Picks.PICK_AVATARS | Picks.PICK_PRECISE;
    var pickID;
    var knifePickLowID;
    var knifePickHighID;
    var pickDesktopID;
    var isGunCreated = false;
    var isKnifeCreated = false;
    var isShooting = false;    
    var isPointing = false;    
    var gunHelperID;
    var knifeHelperHighID;
    var knifeHelperLowID;   
      
    this.remotelyCallable = [
        "teleportMe",
        "giveObject",        
        "notifications",
        "equipKnife",
        "shootGun",
        "startMusic",
        "playSoundEffect",
        "resetGun",
        "removePlayer"                       
    ];

    this.preload = function (entityID) {
        myID = entityID; 
        myName = Entities.getEntityProperties(myID,"name").name; 
        myPosition = Entities.getEntityProperties(myID,"position").position;        
        shootSound = SoundCache.getSound("https://bas-skyspace.ams3.digitaloceanspaces.com/MurderGame/GUN-SHOT2.raw");
        music = SoundCache.getSound("https://bas-skyspace.ams3.digitaloceanspaces.com/MurderGame/435370__dekstromoramid__thriller-documentary-pack-1.wav");
        teleportSound = SoundCache.getSound("https://bas-skyspace.ams3.digitaloceanspaces.com/MurderGame/55853__sergenious__teleport.wav");        
        tadaSound = SoundCache.getSound("https://bas-skyspace.ams3.digitaloceanspaces.com/MurderGame/60445__jobro__tada3.wav");
        clickSound = SoundCache.getSound("https://bas-skyspace.ams3.digitaloceanspaces.com/MurderGame/448086__breviceps__normal-click.wav"); 
        dieSound = SoundCache.getSound("https://bas-skyspace.ams3.digitaloceanspaces.com/MurderGame/345450__artmasterrich__male-death-03.wav");
        deniedSound = SoundCache.getSound("https://bas-skyspace.ams3.digitaloceanspaces.com/MurderGame/419023__jacco18__acess-denied-buzz.mp3");
        swooshSound = SoundCache.getSound("https://bas-skyspace.ams3.digitaloceanspaces.com/MurderGame/419341__wizardoz__swoosh.wav");    
    };

    this.unload = function (id) {
        if (injector !== undefined) {
            if (injector.isPlaying()) {
                injector.stop();
            }
        }
        var gameObjects = Entities.getChildrenIDs(id);
        for (var i in gameObjects) {
            var entityName = Entities.getEntityProperties(gameObjects[i],"name").name;
            if (entityName === "MurderGameWeapon") {
                Entities.deleteEntity(gameObjects[i]);
            }
            if (entityName === "MurderGameGun") {
                Entities.deleteEntity(gameObjects[i]);
            }            
        }
        if (isPointing) {
            MyAvatar.endReaction("point");
            isPointing = false;
        }
    };  

    this.teleportMe = function(id,param) {          
        print(param[0]);      
        var telePortLocation = JSON.parse(param[0]);      
        MyAvatar.position = telePortLocation;                                         
    };    
    
    this.giveObject = function(id,param) { 
        var gun = param[0];       
        print("received " + gun);        
        var RIGHT_HAND_INDEX = MyAvatar.getJointIndex("RightHand");
        print("RIGHT_HAND_INDEX "+ RIGHT_HAND_INDEX);
        var localRot = generateQuatFromDegreesViaRadians (71.87 , 92 , -16.92);
        if (gun === "Gun") {            
            var SCRIPT_URL = LOCATION_ROOT_URL + "MurderGameGun-sky.js?"+ Date.now();
            var MODEL_URL = "https://bas-skyspace.ams3.digitaloceanspaces.com/MurderGame/gun.fbx";
            var gunID = Entities.addEntity( {
                type: "Model",
                name: "MurderGameGun",
                modelURL: MODEL_URL,
                parentID: MyAvatar.sessionUUID,
                parentJointIndex: RIGHT_HAND_INDEX,
                localPosition: { x: 0.0179, y: 0.1467, z: 0.0305 },
                localRotation: localRot,
                localDimensions: { x: 0.0323, y: 0.1487, z: 0.2328 },
                script: SCRIPT_URL,
                serverScripts: "http://192.168.2.200/MurderGame/sky/empty.js",              
                color: { red: 200, green: 0, blue: 20 }, 
                collisionless: true,               
                dynamic: false,                
                lifetime: -1,
                userData: "{ \"grabbableKey\": { \"grabbable\": false, \"triggerable\": false}}" 
            },"avatar");
            gunHelperID = Entities.addEntity({
                type: "Sphere",
                name: "MurderGameGunHelper",
                parentID: gunID,
                collisionless: true,
                visible: false,
                localPosition: { x: -0.0078, y: 0.0547, z: -0.1525 },
                localDimensions: { x: 0.2, y: 0.2, z: 0.05 },
                color: { red: 255, green: 0, blue: 0 },
                userData: "{ \"grabbableKey\": { \"grabbable\": false, \"triggerable\": false}}", 
                lifetime: -1 // Delete after 5 minutes.
            },"avatar");
            if (HMD.active) { 
                pickID = Picks.createPick(PickType.Ray, { 
                    parentID: gunHelperID,
                    direction: Vec3.UNIT_NEG_Z,       
                    filter: PICK_FILTERS,
                    enabled: true
                });
                Picks.setIgnoreItems(pickID, [gunID,gunHelperID]);
            }
            if (!HMD.active) {
                pickDesktopID = Picks.createPick(PickType.Ray, { 
                    joint: "Mouse",                      
                    filter: PICK_FILTERS,
                    enabled: true
                });
            }            
            isGunCreated = true;
            
            // report gunID back to serverscript
            print("sending GunID" + gunID);
            Entities.callEntityServerMethod(                             
                myID, 
                "receiveGun",
                [MyAvatar.sessionUUID,myID,myName, gunID]
            );           
        }
        gun = "";        
    };   
    
    this.removePlayer = function(id) { 
        print("rest players are removed");
        if (isPointing) {
            MyAvatar.endReaction("point");
            isPointing = false;
        }        
        injector.stop();
        isGunCreated = false;
        isKnifeCreated = false;
        var homePosition = Vec3.sum(myPosition, { x: 5, y: 0, z: Math.random()*5 });
        var newOrientation = Quat.lookAtSimple(homePosition,myPosition);        
        MyAvatar.position = homePosition;
        MyAvatar.orientation = newOrientation;

        var gameObjects = Entities.getChildrenIDs(MyAvatar.sessionUUID);
        for (var i in gameObjects) {
            var entityName = Entities.getEntityProperties(gameObjects[i],"name").name;
            if (entityName === "MurderGameWeapon") {
                Entities.deleteEntity(gameObjects[i]);
            }
            if (entityName === "MurderGameGun") {
                Entities.deleteEntity(gameObjects[i]);
            }            
        }
    };

    this.notifications = function(id,param) {
        var message = param[0];
        var WIDTH = message.length * 0.1;     
        var duration = parseFloat(param[1]);
        print("received message" + message);
        var HEAD_INDEX = MyAvatar.getJointIndex("Head");
        if (HMD.active) {               
            Entities.addEntity( {
                type: "Text",
                parentID: MyAvatar.sessionUUID,
                parentJointIndex: HEAD_INDEX,
                name: "MurderGameInfo",                       
                text: message,     
                localPosition: { x: 0, y: 0, z: 1 },
                renderLayer: "front",
                unlit: true,  
                lineHeight: 0.18,
                leftMargin: 0,
                topMargin: 0.05, 
                billboardMode: "full",  
                localDimensions: { x: WIDTH, y: 0.3, z: 0.01 },    
                textColor: { r: 100, g: 100, b: 100 },
                backgroundColor: { r: 0, g: 0, b: 0 },
                backgroundAlpha: 0,                    
                lifetime: duration,               
                userData: "{ \"grabbableKey\": { \"grabbable\": false, \"triggerable\": false}}"     
            },"local");
        }
        if (!HMD.active) {           
            var cameraPos = Camera.position;
            var newNotificationPosition = Vec3.sum(cameraPos,Vec3.multiplyQbyV(Camera.orientation, { x: 0, y: 0.2, z: -2 }));
            print("newNotificationPosition"+JSON.stringify(newNotificationPosition));
            var newLocalNotificationPosition = Entities.worldToLocalPosition( newNotificationPosition, Camera.cameraEntity);                
            Entities.addEntity( {
                type: "Text",
                parentID: Camera.cameraEntity,                
                name: "MurderGameInfo",                       
                text: message,
                renderLayer: "front",
                unlit: true,     
                localPosition: newLocalNotificationPosition,
                lineHeight: 0.18,
                leftMargin: 0,
                topMargin: 0.05, 
                billboardMode: "full",  
                localDimensions: { x: WIDTH, y: 0.3, z: 0.01 },    
                textColor: { r: 100, g: 100, b: 100 },
                backgroundColor: { r: 0, g: 0, b: 0 },
                backgroundAlpha: 0,                
                lifetime: duration,               
                userData: "{ \"grabbableKey\": { \"grabbable\": false, \"triggerable\": false}}"     
            },"local");
        }
    };

    this.equipKnife = function(id,param) {                                       
        var RIGH_HAND_INDEX = MyAvatar.getJointIndex("RightHand");                
        var localRot = generateQuatFromDegreesViaRadians (176 , -177 , 36);
        var knifeID = Entities.addEntity( {
            type: "Model",
            modelURL: "https://bas-skyspace.ams3.digitaloceanspaces.com/MurderGame/Knive3.fbx",
            shapeType: "simple-hull",            
            collidesWith: "static,dynamic,kinematic,otherAvatar",                  
            name: "MurderGameWeapon",
            parentID: MyAvatar.sessionUUID,
            parentJointIndex: RIGH_HAND_INDEX,
            script: LOCATION_ROOT_URL + "MurderGameWeapon-sky.js?"+ Date.now(),           
            localDimensions: { x: 0.65, y: 0.15, z: 0.05 },    
            localPosition: { x: 0.174, y: 0.197, z: 0.022 }, 
            localRotation: localRot,                            
            lifetime: -1,          
            userData: "{ \"grabbableKey\": { \"grabbable\": false, \"triggerable\": true}}"
        },"avatar");
        localRot = generateQuatFromDegreesViaRadians (0 , 0 , 3);
        knifeHelperHighID = Entities.addEntity({
            type: "Sphere",
            name: "MurderGameKnifeHelperHigh",
            parentID: knifeID,
            collisionless: true,
            visible: false,
            localPosition: { x: 0.09, y: 0.05, z: 0 },
            localRotation: localRot,
            localDimensions: { x: 0.04, y: 0.04, z: 0.04 },
            color: { red: 0, green: 180, blue: 240 },
            userData: "{ \"grabbableKey\": { \"grabbable\": false, \"triggerable\": false}}", 
            lifetime: -1 // Delete after 5 minutes.
        },"avatar");
        localRot = generateQuatFromDegreesViaRadians (0 , 0 , -5);
        knifeHelperLowID = Entities.addEntity({
            type: "Sphere",
            name: "MurderGameKnifeHelperLow",
            parentID: knifeID,
            collisionless: true,
            visible: false,
            localPosition: { x: 0.09, y: -0.04, z: 0 },
            localRotation: localRot,
            localDimensions: { x: 0.04, y: 0.04, z: 0.04 },
            color: { red: 0, green: 240, blue: 180 },
            userData: "{ \"grabbableKey\": { \"grabbable\": false, \"triggerable\": false}}", 
            lifetime: -1 // Delete after 5 minutes.
        },"avatar");
        knifePickHighID = Picks.createPick(PickType.Ray, { 
            parentID: knifeHelperHighID,
            direction: Vec3.UNIT_NEG_X,       
            filter: PICK_FILTERS,
            enabled: true,
            maxDistance: 0.415
        });
        knifePickLowID = Picks.createPick(PickType.Ray, { 
            parentID: knifeHelperLowID,
            direction: Vec3.UNIT_NEG_X,       
            filter: PICK_FILTERS,
            enabled: true,
            maxDistance: 0.415
        });
        Picks.setIgnoreItems(knifePickHighID, [knifeID,knifeHelperHighID,knifeHelperLowID,id]);
        Picks.setIgnoreItems(knifePickLowID, [knifeID,knifeHelperHighID,knifeHelperLowID,id]);
        isKnifeCreated = true;
        Entities.callEntityServerMethod(                             
            myID, 
            "receiveKnife",
            [MyAvatar.sessionUUID, myID, myName, knifeID]
        );                 
    };

    this.shootGun = function(id,param) {        
        isShooting = true;
    };

    this.resetGun = function(id,param) {
        isPointing = false;
        isGunCreated = false;
    };

    this.startMusic = function(id,param) {
        print("start playing music");        
        var injectorOptionsMusic = {
            position: Vec3.sum(myPosition,{ x: 0, y: -15, z: 0 }),       
            volume: 0.3,            
            loop: true,
            localOnly: true           
        };        
        Script.setTimeout(function () { // Give the sound time to load.
            injector = Audio.playSound(music, injectorOptionsMusic);            
        }, 2000);
    
    };

    this.playSoundEffect = function(id,param) {
        var newSound = param[0];
        var effectSound;
        var injectorOptions = {
            position: MyAvatar.position,
            volume: 0.1,
            localOnly: false            
        };

        if ( newSound === "teleport") {
            effectSound = teleportSound;            
        }
        if ( newSound === "click") {
            effectSound = clickSound;
            injectorOptions = {localOnly: true};
        }
        if ( newSound === "tada") {
            effectSound = tadaSound;
        }

        if ( newSound === "shoot") {
            effectSound = shootSound;
        }

        if ( newSound === "die") {
            effectSound = dieSound;
        }

        if ( newSound === "denied") {
            effectSound = deniedSound;
            injectorOptions = {localOnly: true};           
        }
        
        if ( newSound === "swoosh") {
            effectSound = swooshSound;
            injectorOptions = {localOnly: true};             
        }   

        Audio.playSound(effectSound, injectorOptions);    
    };

    function generateQuatFromDegreesViaRadians(rotxdeg,rotydeg,rotzdeg) {
        var rotxrad = (rotxdeg/180)*Math.PI;
        var rotyrad = (rotydeg/180)*Math.PI;
        var rotzrad = (rotzdeg/180)*Math.PI;          
        var newRotation = Quat.fromPitchYawRollRadians(rotxrad,rotyrad,rotzrad); 
        return newRotation;
    }

    function createEntityHitEffect(position) {
        print(JSON.stringify(position));
        var sparks = Entities.addEntity({
            type: "ParticleEffect",
            position: position,
            lifetime: 4,
            "name": "Sparks Emitter",
            "color": {
                red: 228,
                green: 128,
                blue: 12
            },
            "maxParticles": 1000,
            "lifespan": 0.2,
            "emitRate": 1000,
            "emitSpeed": 1,
            "speedSpread": 0,
            "emitOrientation": {
                "x": -0.4,
                "y": 1,
                "z": -0.2,
                "w": 0.7071068286895752
            },
            "emitDimensions": {
                "x": 0,
                "y": 0,
                "z": 0
            },
            "polarStart": 0,
            "polarFinish": Math.PI,
            "azimuthStart": -3.1415927410125732,
            "azimuthFinish": 2,
            "emitAcceleration": {
                "x": 0,
                "y": 0,
                "z": 0
            },
            "accelerationSpread": {
                "x": 0,
                "y": 0,
                "z": 0
            },
            "particleRadius": 0.12,
            "radiusSpread": 0.04,
            "radiusStart": 0.04,
            "radiusFinish": 0.06,
            "colorSpread": {
                red: 100,
                green: 100,
                blue: 20
            },
            "alpha": 1,
            "alphaSpread": 0,
            "alphaStart": 0,
            "alphaFinish": 0,
            "additiveBlending": true,
            "textures": "https://bas-skyspace.ams3.digitaloceanspaces.com/MurderGame/star.png"
        },"avatar");

        Script.setTimeout(function() {
            Entities.editEntity(sparks, {
                isEmitting: false
            });
        }, 100);
    }

    function keyPressEvent(event) {   
        switch (event.text) {        
            case "*":
                if (reset) {
                    Entities.callEntityServerMethod(                             
                        myID, 
                        "receiveDataFromItem",
                        [MyAvatar.sessionUUID,myID,myName,"quit"]
                    );
                    reset = false;
                    print("reset = false");
                }                                           
                break; 
            case "&":
                if (reset) {
                    Entities.reloadServerScripts(myID);                    
                    reset = false;
                }                                   
                break;
            case "%":
                if (reset) {
                    Entities.callEntityServerMethod(                             
                        myID, 
                        "receiveDataFromItem",
                        [MyAvatar.sessionUUID,myID,myName,"roleChange"]
                    );
                    reset = false;
                }
                break;                                                         
        }
    }

    Controller.keyPressEvent.connect(keyPressEvent);    

    // handle pickrays
    Script.setInterval(function() {
        if (isKnifeCreated) {
            var knifeResult1 = Picks.getPrevPickResult(knifePickHighID);
            if (knifeResult1.intersects) {              
                print("knifeHigh intersects " + knifeResult1.objectID);                               
                Entities.callEntityServerMethod(                             
                    myID, 
                    "receiveDataFromItem",
                    [MyAvatar.sessionUUID,myID,myName,knifeResult1.objectID]);                             
            }
            var knifeResult2 = Picks.getPrevPickResult(knifePickHighID);
            if (knifeResult2.intersects) {              
                print("knifeHigh intersects " + knifeResult2.objectID);                               
                Entities.callEntityServerMethod(                             
                    myID, 
                    "receiveDataFromItem",
                    [MyAvatar.sessionUUID,myID,myName,knifeResult2.objectID]);                             
            }
        }

        if (isGunCreated) {                           
            if (!HMD.active) {                                             
                if (isPointing === false) {
                    MyAvatar.beginReaction("point");
                    isPointing = true;
                }
                var desktopResult = Picks.getPrevPickResult(pickDesktopID);
                if (desktopResult.intersects) {
                    var infront = false;
                    if (isPointing) {
                        infront = MyAvatar.setPointAt(desktopResult.intersection);
                    }
                    if (isShooting && infront) {
                        isShooting = false; 
                        createEntityHitEffect(desktopResult.intersection);
                        print("desktop intersects " + desktopResult.objectID);                               
                        Entities.callEntityServerMethod(                             
                            myID, 
                            "receiveDataFromItem",
                            [MyAvatar.sessionUUID,myID,myName,desktopResult.objectID]);                        
                    }               
                }
            }
            if (HMD.active) {
                if (isPointing) {                                
                    MyAvatar.endReaction("point");
                    isPointing = false;
                }               
                var result = Picks.getPrevPickResult(pickID);
                if (result.intersects) {

                    if (isShooting) {
                        createEntityHitEffect(result.intersection);
                        print("intersects " + result.objectID);                               
                        Entities.callEntityServerMethod(                             
                            myID, 
                            "receiveDataFromItem",
                            [MyAvatar.sessionUUID,myID,myName,result.objectID]
                        );
                        isShooting = false; 
                    }               
                }
            }                           
        }
    }, UPDATE_MS);

    Script.setInterval(function () {
        reset = true;    
    }, RESET_TIME);

    Script.scriptEnding.connect(function () {             
        injector.stop();       
        Controller.keyPressEvent.disconnect(keyPressEvent);
        Picks.removePick(pickID); 
        Picks.removePick(pickDesktopID);
        Picks.removePick(knifePickHighID); 
        Picks.removePick(knifeHelperLowID);      
    });     
});

